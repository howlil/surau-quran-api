const prisma  = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const CommonServiceUtils = require('../../lib/utils/common.service.utils');
const logger = require('../../lib/config/logger.config');

class KelasProgramService {

    async getInitialStudentIntoClass(options = {}) {
        try {
            const { filters = {} } = options;
            const kelasList = await prisma.kelas.findMany({
                include: {
                    kelasProgram: {
                        include: {
                            program: true,
                            jamMengajar: true,
                            guru: true,
                            programSiswa: {
                                include: {
                                    siswa: true
                                }
                            },
                            kelasPengganti: {
                                where: {
                                    deletedAt: null,
                                    isTemp: true
                                },
                                include: {
                                    siswa: true
                                }
                            }
                        }
                    }
                }
            });


            const result = kelasList.map(kelas => ({
                kelasId: kelas.id,
                namaKelas: kelas.namaKelas,
                program: kelas.kelasProgram.map(kp => {
                    // Get regular students
                    const regularStudents = kp.programSiswa
                        .filter(ps => ps.status === 'AKTIF')
                        .map(ps => ({
                            siswaId: ps.siswa.id,
                            namaSiswa: ps.siswa.namaMurid,
                            NIS: ps.siswa.nis,
                            isTemp: false
                        }));

                    // Get temporary students (unique by siswaId)
                    const tempStudentsMap = new Map();
                    kp.kelasPengganti.forEach(kpg => {
                        if (!tempStudentsMap.has(kpg.siswa.id)) {
                            tempStudentsMap.set(kpg.siswa.id, {
                                siswaId: kpg.siswa.id,
                                namaSiswa: kpg.siswa.namaMurid,
                                NIS: kpg.siswa.nis,
                                isTemp: true
                            });
                        }
                    });
                    const tempStudents = Array.from(tempStudentsMap.values());

                    // Combine all students
                    const allStudents = [...regularStudents, ...tempStudents];

                    return {
                        kelasProgramId: kp.id,
                        programId: kp.programId,
                        namaProgram: kp.program?.namaProgram || null,
                        hari: kp.hari,
                        jadwal: kp.jamMengajar
                            ? {
                                jamMengajarId: kp.jamMengajar.id,
                                jamMulai: kp.jamMengajar.jamMulai,
                                jamSelesai: kp.jamMengajar.jamSelesai
                            }
                            : null,
                        guru: kp.guru
                            ? {
                                guruId: kp.guru.id,
                                namaGuru: kp.guru.nama,
                                NIP: kp.guru.nip || null
                            }
                            : null,
                        siswa: allStudents
                    };
                })
            }));

            return result;
        } catch (err) {
            throw err;
        }
    }

    async checkGuruScheduleConflict(tx, guruId, hari, jamMengajarId, excludeKelasProgramId = null) {
        if (!guruId) return false;

        const whereClause = {
            guruId,
            hari,
            jamMengajarId
        };

        if (excludeKelasProgramId) {
            whereClause.id = { not: excludeKelasProgramId };
        }

        const conflictingSchedule = await tx.kelasProgram.findFirst({
            where: whereClause,
            include: {
                program: {
                    select: { namaProgram: true }
                },
                kelas: {
                    select: { namaKelas: true }
                },
                jamMengajar: {
                    select: { jamMulai: true, jamSelesai: true }
                }
            }
        });

        if (conflictingSchedule) {
            const conflictInfo = {
                program: conflictingSchedule.program.namaProgram,
                kelas: conflictingSchedule.kelas?.namaKelas || 'Tidak Ada Kelas',
                jam: `${conflictingSchedule.jamMengajar.jamMulai} - ${conflictingSchedule.jamMengajar.jamSelesai}`,
                hari: conflictingSchedule.hari
            };

            throw ErrorFactory.badRequest(
                `Guru sudah memiliki jadwal mengajar pada ${conflictInfo.hari} jam ${conflictInfo.jam} ` +
                `untuk program ${conflictInfo.program} di kelas ${conflictInfo.kelas}. ` +
                `Satu guru tidak dapat mengajar di jam yang sama pada hari yang sama.`
            );
        }

        return false;
    }

    async patchInitialStudentIntoClass(options) {
        try {
            const { data, where } = options;
            const { kelasProgramId } = where;
            const {
                programId,
                hari,
                jamMengajarId,
                guruId,
                tambahSiswaIds = [],
                hapusSiswaIds = []
            } = data;

            return await prisma.$transaction(async (tx) => {
                // First get the existing kelas program
                const existingKelasProgram = await tx.kelasProgram.findUnique({
                    where: { id: kelasProgramId },
                    include: {
                        programSiswa: {
                            where: { status: 'AKTIF' }
                        }
                    }
                });

                if (!existingKelasProgram) {
                    throw ErrorFactory.notFound(`Kelas program dengan ID ${kelasProgramId} tidak ditemukan`);
                }

                // Update kelas program if there are changes
                const updateData = {};
                if (programId) updateData.programId = programId;
                if (hari) updateData.hari = hari;
                if (jamMengajarId) updateData.jamMengajarId = jamMengajarId;
                if (guruId) updateData.guruId = guruId;

                // Check for guru schedule conflict before updating
                if (guruId || hari || jamMengajarId) {
                    const checkHari = hari || existingKelasProgram.hari;
                    const checkJamMengajarId = jamMengajarId || existingKelasProgram.jamMengajarId;
                    const checkGuruId = guruId || existingKelasProgram.guruId;

                    // Only check for conflict if we have all required fields
                    if (checkGuruId && checkHari && checkJamMengajarId) {
                        await this.checkGuruScheduleConflict(tx, checkGuruId, checkHari, checkJamMengajarId, kelasProgramId);
                    }
                }

                let updatedKelasProgram = existingKelasProgram;
                if (Object.keys(updateData).length > 0) {
                    updatedKelasProgram = await tx.kelasProgram.update({
                        where: { id: kelasProgramId },
                        data: updateData
                    });
                }

                let siswaDitambah = [];
                let siswaDihapus = [];

                // Check if this is purely a class program metadata update (no student management intent)
                const isMetadataOnlyUpdate = (programId || hari || jamMengajarId || guruId) &&
                    (!tambahSiswaIds || tambahSiswaIds.length === 0) &&
                    (!hapusSiswaIds || hapusSiswaIds.length === 0);

                if (isMetadataOnlyUpdate) {
                }

                // Handle student removal first - only if not a metadata-only update
                if (!isMetadataOnlyUpdate && hapusSiswaIds && hapusSiswaIds.length > 0) {
                    // Verify that these students actually exist in this kelas program
                    const existingStudentsInClass = await tx.programSiswa.findMany({
                        where: {
                            siswaId: { in: hapusSiswaIds },
                            kelasProgramId,
                            status: 'AKTIF'
                        },
                        include: {
                            siswa: {
                                select: {
                                    id: true,
                                    namaMurid: true,
                                    nis: true
                                }
                            }
                        }
                    });

                    if (existingStudentsInClass.length > 0) {
                        // Remove students from kelas program
                        await tx.programSiswa.updateMany({
                            where: {
                                siswaId: { in: existingStudentsInClass.map(ps => ps.siswaId) },
                                kelasProgramId,
                                status: 'AKTIF'
                            },
                            data: {
                                kelasProgramId: null
                            }
                        });

                        siswaDihapus = existingStudentsInClass.map(ps => ({
                            siswaId: ps.siswa.id,
                            namaSiswa: ps.siswa.namaMurid,
                            NIS: ps.siswa.nis
                        }));

                    }
                }

                // Handle student additions - only if not a metadata-only update
                if (!isMetadataOnlyUpdate && tambahSiswaIds && tambahSiswaIds.length > 0) {
                    // Get program details to determine if it's private
                    const program = await tx.program.findUnique({
                        where: { id: updatedKelasProgram.programId },
                        select: { tipeProgram: true, namaProgram: true }
                    });

                    if (!program) {
                        throw ErrorFactory.notFound('Program tidak ditemukan');
                    }

                    let programSiswaList;

                    if (program.tipeProgram === 'PRIVATE') {
                        // Tentukan subtipe private berdasarkan nama program
                        const getPrivateSubType = (programName) => {
                            if (programName.toLowerCase().includes('mandiri')) return 'MANDIRI';
                            if (programName.toLowerCase().includes('sharing')) return 'SHARING';
                            if (programName.toLowerCase().includes('bersaudara')) return 'BERSAUDARA';
                            return null;
                        };

                        const subType = getPrivateSubType(program.namaProgram);

                        if (subType === 'MANDIRI') {
                            // Private Mandiri: hanya 1 siswa, tidak ada keluargaId
                            if (tambahSiswaIds.length > 1) {
                                throw ErrorFactory.badRequest('Program Private Mandiri hanya bisa menambahkan 1 siswa');
                            }

                            const siswa = await tx.siswa.findUnique({
                                where: { id: tambahSiswaIds[0] },
                                select: { keluargaId: true }
                            });

                            if (siswa && siswa.keluargaId) {
                                throw ErrorFactory.badRequest('Siswa untuk program Private Mandiri tidak boleh memiliki keluargaId');
                            }

                            programSiswaList = await tx.programSiswa.findMany({
                                where: {
                                    siswaId: { in: tambahSiswaIds },
                                    status: 'AKTIF',
                                    programId: updatedKelasProgram.programId,
                                    kelasProgramId: null,
                                    siswa: {
                                        keluargaId: null // Hanya siswa tanpa keluargaId
                                    }
                                },
                                include: {
                                    siswa: true
                                }
                            });


                        } else if (subType === 'SHARING' || subType === 'BERSAUDARA') {
                            // Private Sharing/Bersaudara: max 3 untuk sharing, max 4 untuk bersaudara
                            const maxStudents = subType === 'SHARING' ? 3 : 4;

                            if (tambahSiswaIds.length > maxStudents) {
                                throw ErrorFactory.badRequest(`Program Private ${subType} maksimal ${maxStudents} siswa`);
                            }

                            // Ambil ID siswa pertama sebagai ketua keluarga
                            const firstSiswaId = tambahSiswaIds[0];

                            // Cari semua siswa yang memiliki keluargaId yang sama dengan ketua
                            programSiswaList = await tx.programSiswa.findMany({
                                where: {
                                    siswaId: { in: tambahSiswaIds },
                                    status: 'AKTIF',
                                    programId: updatedKelasProgram.programId,
                                    kelasProgramId: null,
                                    siswa: {
                                        OR: [
                                            { id: firstSiswaId }, // Ketua (tidak punya keluargaId)
                                            { keluargaId: firstSiswaId } // Anggota keluarga
                                        ]
                                    }
                                },
                                include: {
                                    siswa: true
                                }
                            });

                        } else {
                            throw ErrorFactory.badRequest('Tipe program private tidak dikenali. Pastikan nama program mengandung "mandiri", "sharing", atau "bersaudara"');
                        }
                    } else {
                        // Untuk program group, logic tetap sama seperti sebelumnya
                        programSiswaList = await tx.programSiswa.findMany({
                            where: {
                                siswaId: { in: tambahSiswaIds },
                                status: 'AKTIF',
                                programId: updatedKelasProgram.programId,
                                kelasProgramId: null // Hanya siswa yang belum terdaftar di kelas program manapun
                            },
                            include: {
                                siswa: true
                            }
                        });
                    }

                    // Check if any students are already assigned to other kelas programs
                    const alreadyAssignedStudents = await tx.programSiswa.findMany({
                        where: {
                            siswaId: { in: tambahSiswaIds },
                            status: 'AKTIF',
                            programId: updatedKelasProgram.programId,
                            kelasProgramId: { not: null }
                        },
                        include: {
                            siswa: true,
                            kelasProgram: {
                                include: {
                                    kelas: true,
                                    program: true
                                }
                            }
                        }
                    });

                    if (alreadyAssignedStudents.length > 0) {
                        const conflictDetails = alreadyAssignedStudents.map(ps => ({
                            siswaId: ps.siswa.id,
                            namaSiswa: ps.siswa.namaMurid,
                            kelasProgramId: ps.kelasProgramId,
                            namaKelas: ps.kelasProgram?.kelas?.namaKelas,
                            namaProgram: ps.kelasProgram?.program?.namaProgram
                        }));

                        throw ErrorFactory.badRequest(`Beberapa siswa sudah terdaftar di kelas program lain: ${conflictDetails.map(s => s.namaSiswa).join(', ')}`);
                    }

                    // Check if any students are already in this specific kelas program
                    const alreadyInThisClass = await tx.programSiswa.findMany({
                        where: {
                            siswaId: { in: tambahSiswaIds },
                            status: 'AKTIF',
                            programId: updatedKelasProgram.programId,
                            kelasProgramId: kelasProgramId
                        },
                        include: {
                            siswa: true
                        }
                    });

                    if (alreadyInThisClass.length > 0) {
                        const alreadyInClassDetails = alreadyInThisClass.map(ps => ({
                            siswaId: ps.siswa.id,
                            namaSiswa: ps.siswa.namaMurid
                        }));

                        throw ErrorFactory.badRequest(`Beberapa siswa sudah terdaftar di kelas program ini: ${alreadyInClassDetails.map(s => s.namaSiswa).join(', ')}`);
                    }

                    // Check if any students don't exist in the program
                    const foundSiswaIds = programSiswaList.map(ps => ps.siswaId);
                    const notFoundSiswaIds = tambahSiswaIds.filter(id => !foundSiswaIds.includes(id));

                    if (notFoundSiswaIds.length > 0) {
                        const notFoundStudents = await tx.siswa.findMany({
                            where: { id: { in: notFoundSiswaIds } },
                            select: { id: true, namaMurid: true, nis: true }
                        });

                        throw ErrorFactory.notFound(`Beberapa siswa tidak ditemukan dalam program ini: ${notFoundStudents.map(s => s.namaMurid).join(', ')}`);
                    }

                    // Batch update programSiswa
                    const ids = programSiswaList.map(ps => ps.id);
                    if (ids.length > 0) {
                        await tx.programSiswa.updateMany({
                            where: { id: { in: ids } },
                            data: { kelasProgramId: kelasProgramId }
                        });

                    }

                    siswaDitambah = programSiswaList.map(ps => ({
                        siswaId: ps.siswa.id,
                        namaSiswa: ps.siswa.namaMurid,
                        NIS: ps.siswa.nis
                    }));
                }

                // Get updated kelas program with all relations
                const finalKelasProgram = await tx.kelasProgram.findUnique({
                    where: { id: kelasProgramId },
                    include: {
                        program: true,
                        jamMengajar: true,
                        guru: true,
                        programSiswa: {
                            where: { status: 'AKTIF' },
                            include: {
                                siswa: true
                            }
                        }
                    }
                });

                return {
                    kelasProgramId,
                    updateData,
                    siswaDitambah,
                    siswaDihapus,
                    kelasProgram: {
                        id: finalKelasProgram.id,
                        namaProgram: finalKelasProgram.program?.namaProgram,
                        hari: finalKelasProgram.hari,
                        jamMengajar: finalKelasProgram.jamMengajar ? {
                            jamMulai: finalKelasProgram.jamMengajar.jamMulai,
                            jamSelesai: finalKelasProgram.jamMengajar.jamSelesai
                        } : null,
                        guru: finalKelasProgram.guru ? {
                            id: finalKelasProgram.guru.id,
                            nama: finalKelasProgram.guru.nama,
                            nip: finalKelasProgram.guru.nip
                        } : null,
                        siswa: finalKelasProgram.programSiswa.map(ps => ({
                            id: ps.siswa.id,
                            nama: ps.siswa.namaMurid,
                            nis: ps.siswa.nis
                        }))
                    }
                };
            });
        } catch (err) {
            throw err;
        }
    }

    async createKelasProgram(options) {
        try {
            const { data } = options;
            const { kelasId, programId, hari, jamMengajarId, guruId, siswaIds = [] } = data;

            return await prisma.$transaction(async (tx) => {
                // Check for existing kelas program
                const existingKelasProgram = await tx.kelasProgram.findFirst({
                    where: {
                        kelasId,
                        programId,
                        hari,
                        jamMengajarId
                    }
                });

                if (existingKelasProgram) {
                    throw ErrorFactory.badRequest('Kelas program dengan kombinasi ini sudah ada');
                }

                // Check for guru schedule conflict
                await this.checkGuruScheduleConflict(tx, guruId, hari, jamMengajarId);

                // Create the kelas program
                const kelasProgram = await tx.kelasProgram.create({
                    data: {
                        kelasId,
                        programId,
                        hari,
                        jamMengajarId,
                        guruId
                    }
                });

                // Get program details to determine if it's private
                const program = await tx.program.findUnique({
                    where: { id: programId },
                    select: { tipeProgram: true, namaProgram: true }
                });

                if (!program) {
                    throw ErrorFactory.notFound('Program tidak ditemukan');
                }

                // Process student assignments
                const processedSiswa = [];
                if (siswaIds.length > 0) {
                    let eligibleProgramSiswa;

                    if (program.tipeProgram === 'PRIVATE') {
                        // Tentukan subtipe private berdasarkan nama program
                        const getPrivateSubType = (programName) => {
                            if (programName.toLowerCase().includes('mandiri')) return 'MANDIRI';
                            if (programName.toLowerCase().includes('sharing')) return 'SHARING';
                            if (programName.toLowerCase().includes('bersaudara')) return 'BERSAUDARA';
                            return null;
                        };

                        const subType = getPrivateSubType(program.namaProgram);

                        if (subType === 'MANDIRI') {
                            // Private Mandiri: hanya 1 siswa, tidak ada keluargaId
                            if (siswaIds.length > 1) {
                                throw ErrorFactory.badRequest('Program Private Mandiri hanya bisa menambahkan 1 siswa');
                            }

                            const siswa = await tx.siswa.findUnique({
                                where: { id: siswaIds[0] },
                                select: { keluargaId: true }
                            });

                            if (siswa && siswa.keluargaId) {
                                throw ErrorFactory.badRequest('Siswa untuk program Private Mandiri tidak boleh memiliki keluargaId');
                            }

                            eligibleProgramSiswa = await tx.programSiswa.findMany({
                                where: {
                                    siswaId: { in: siswaIds },
                                    programId,
                                    status: 'AKTIF',
                                    kelasProgramId: null,
                                    siswa: {
                                        keluargaId: null // Hanya siswa tanpa keluargaId
                                    }
                                },
                                include: {
                                    siswa: true
                                }
                            });


                        } else if (subType === 'SHARING' || subType === 'BERSAUDARA') {
                            // Private Sharing/Bersaudara: max 3 untuk sharing, max 4 untuk bersaudara
                            const maxStudents = subType === 'SHARING' ? 3 : 4;

                            if (siswaIds.length > maxStudents) {
                                throw ErrorFactory.badRequest(`Program Private ${subType} maksimal ${maxStudents} siswa`);
                            }

                            // Ambil ID siswa pertama sebagai ketua keluarga
                            const firstSiswaId = siswaIds[0];

                            // Cari semua siswa yang memiliki keluargaId yang sama dengan ketua
                            eligibleProgramSiswa = await tx.programSiswa.findMany({
                                where: {
                                    siswaId: { in: siswaIds },
                                    programId,
                                    status: 'AKTIF',
                                    kelasProgramId: null,
                                    siswa: {
                                        OR: [
                                            { id: firstSiswaId }, // Ketua (tidak punya keluargaId)
                                            { keluargaId: firstSiswaId } // Anggota keluarga
                                        ]
                                    }
                                },
                                include: {
                                    siswa: true
                                }
                            });

                        } else {
                            throw ErrorFactory.badRequest('Tipe program private tidak dikenali. Pastikan nama program mengandung "mandiri", "sharing", atau "bersaudara"');
                        }
                    } else {
                        // Untuk program group, logic tetap sama seperti sebelumnya
                        eligibleProgramSiswa = await tx.programSiswa.findMany({
                            where: {
                                siswaId: { in: siswaIds },
                                programId,
                                status: 'AKTIF',
                                kelasProgramId: null // Hanya siswa yang belum terdaftar di kelas program lain
                            },
                            include: {
                                siswa: true
                            }
                        });
                    }


                    const ids = eligibleProgramSiswa.map(ps => ps.id);
                    if (ids.length > 0) {
                        await tx.programSiswa.updateMany({
                            where: { id: { in: ids } },
                            data: { kelasProgramId: kelasProgram.id }
                        });
                    }
                    processedSiswa.push(...eligibleProgramSiswa.map(ps => ({
                        siswaId: ps.siswa.id,
                        namaSiswa: ps.siswa.namaMurid,
                        NIS: ps.siswa.nis
                    })));
                }


                return {
                    id: kelasProgram.id,
                    kelasId: kelasProgram.kelasId,
                    programId: kelasProgram.programId,
                    hari: kelasProgram.hari,
                    jamMengajarId: kelasProgram.jamMengajarId,
                    guruId: kelasProgram.guruId,
                    siswaYangDitambahkan: processedSiswa
                };
            });
        } catch (error) {
            logger.error(error);
      throw error;
        }
    }

    async deleteKelasProgram(options) {
        try {
            const { where } = options;
            const { kelasProgramId } = where;
            const kelasProgram = await prisma.kelasProgram.findUnique({
                where: { id: kelasProgramId },
                include: {
                    programSiswa: {
                        where: { status: 'AKTIF' }
                    }
                }
            });

            if (!kelasProgram) {
                throw ErrorFactory.notFound(`Kelas program dengan ID ${kelasProgramId} tidak ditemukan`);
            }

            if (kelasProgram.programSiswa.length > 0) {
                throw ErrorFactory.badRequest('Kelas program ini memiliki siswa yang terdaftar dan tidak dapat dihapus');
            }

            // Use transaction to ensure data consistency
            await prisma.$transaction(async (tx) => {
                // Delete all related records in order
                // 1. Delete AbsensiSiswa records
                await tx.absensiSiswa.deleteMany({
                    where: { kelasProgramId }
                });

                // 2. Delete AbsensiGuru records
                await tx.absensiGuru.deleteMany({
                    where: { kelasProgramId }
                });

                // 3. Update ProgramSiswa records to remove kelasProgramId reference
                await tx.programSiswa.updateMany({
                    where: { kelasProgramId },
                    data: {
                        kelasProgramId: null,
                    }
                });

                // 4. Finally delete the kelas program
                await tx.kelasProgram.delete({
                    where: { id: kelasProgramId }
                });
            });

            return { kelasProgramId };
        } catch (error) {
            logger.error(error);
      throw error;
        }
    }

    async addKelasPengganti(options) {
        try {
            const { data, where } = options;
            const { guruId } = where;
            const { kelasProgramId, siswaId, tanggal } = data;

            // Validasi bahwa kelas program ada
            const kelasProgram = await prisma.kelasProgram.findUnique({
                where: {
                    id: kelasProgramId
                }
            });

            if (!kelasProgram) {
                throw ErrorFactory.notFound(`Kelas program dengan ID ${kelasProgramId} tidak ditemukan`);
            }

            // Validasi bahwa guru berwenang untuk kelas program ini
            if (kelasProgram.guruId !== guruId) {
                throw ErrorFactory.notFound('Guru tidak berwenang untuk kelas program ini');
            }

            // Validasi bahwa siswa ada
            const siswa = await prisma.siswa.findUnique({
                where: { id: siswaId }
            });

            if (!siswa) {
                throw ErrorFactory.notFound('Siswa tidak ditemukan');
            }

            // Validasi bahwa siswa memiliki kelas program aktif
            const activeProgramSiswa = await prisma.programSiswa.findFirst({
                where: {
                    siswaId,
                    status: 'AKTIF',
                    kelasProgramId: { not: null } // Harus sudah terdaftar di kelas program
                },
                include: {
                    kelasProgram: {
                        include: {
                            program: true,
                            kelas: true
                        }
                    }
                }
            });

            if (!activeProgramSiswa) {
                throw ErrorFactory.badRequest('Siswa belum terdaftar dalam kelas program manapun. Siswa harus memiliki kelas program aktif untuk bisa mengikuti kelas pengganti');
            }


            const [tanggalDay, tanggalMonth, tanggalYear] = tanggal.split('-');
            const formattedDate = `${tanggalYear}-${tanggalMonth}-${tanggalDay}`;
            const today = CommonServiceUtils.getCurrentDate('YYYY-MM-DD');
            if (formattedDate < today) {
                throw ErrorFactory.badRequest('Tanggal tidak boleh di masa lalu');
            }

            // Validasi bahwa tanggal sesuai dengan hari kelas program
            const inputDate = new Date(formattedDate);
            const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
            const inputDayName = dayNames[inputDate.getDay()];

            if (inputDayName !== kelasProgram.hari) {
                throw ErrorFactory.badRequest(`Tanggal ${tanggal} adalah hari ${inputDayName}, tidak sesuai dengan jadwal kelas program yang adalah hari ${kelasProgram.hari}`);
            }

            // Cek apakah sudah ada kelas pengganti untuk siswa ini di tanggal yang sama
            const existingKelasPengganti = await prisma.kelasPengganti.findFirst({
                where: {
                    kelasProgramId,
                    siswaId,
                    tanggal
                }
            });

            if (existingKelasPengganti) {
                if (existingKelasPengganti.deletedAt) {
                    // Jika sudah ada tapi soft deleted, reaktivasi saja
                    const result = await prisma.$transaction(async (tx) => {
                        const reactivated = await tx.kelasPengganti.update({
                            where: { id: existingKelasPengganti.id },
                            data: {
                                deletedAt: null,
                                isTemp: true,
                                count: existingKelasPengganti.count + 1,
                                updatedAt: new Date()
                            },
                            include: {
                                siswa: {
                                    select: {
                                        id: true,
                                        namaMurid: true,
                                        nis: true
                                    }
                                },
                                kelasProgram: {
                                    include: {
                                        program: {
                                            select: {
                                                namaProgram: true
                                            }
                                        },
                                        jamMengajar: {
                                            select: {
                                                jamMulai: true,
                                                jamSelesai: true
                                            }
                                        }
                                    }
                                }
                            }
                        });

                        // Cek apakah absensi sudah ada
                        const existingAbsensi = await tx.absensiSiswa.findFirst({
                            where: {
                                kelasProgramId,
                                siswaId,
                                tanggal
                            }
                        });

                        // Buat absensi jika belum ada
                        if (!existingAbsensi) {
                            await tx.absensiSiswa.create({
                                data: {
                                    kelasProgramId,
                                    siswaId,
                                    tanggal,
                                    statusKehadiran: 'TIDAK_HADIR' // Status default, guru bisa ubah nanti
                                }
                            });
                        }

                        return reactivated;
                    });


                    return {
                        id: result.id,
                        siswaId: result.siswa.id,
                        namaSiswa: result.siswa.namaMurid,
                        nis: result.siswa.nis,
                        tanggal: result.tanggal,
                        namaProgram: result.kelasProgram.program.namaProgram,
                        jamMengajar: {
                            jamMulai: result.kelasProgram.jamMengajar.jamMulai,
                            jamSelesai: result.kelasProgram.jamMengajar.jamSelesai
                        },
                        absensiCreated: true
                    };
                } else {
                    throw ErrorFactory.badRequest('Siswa sudah ditambahkan ke kelas pengganti ini di tanggal yang sama');
                }
            }

            const [dayPart, monthPart, yearPart] = tanggal.split('-');

            // Count using string pattern matching for DD-MM-YYYY format
            const monthlyCount = await prisma.kelasPengganti.count({
                where: {
                    siswaId,
                    tanggal: {
                        contains: `-${monthPart}-${yearPart}`
                    },
                    isTemp: true,
                    deletedAt: null
                }
            });

            if (monthlyCount >= 2) {
                throw ErrorFactory.badRequest('Siswa sudah mencapai batas maksimal kelas pengganti dalam 1 bulan (2x)');
            }

            // Cek apakah siswa sudah ada di kelas program ini secara permanen
            const existingProgramSiswa = await prisma.programSiswa.findFirst({
                where: {
                    siswaId,
                    kelasProgramId,
                    status: 'AKTIF'
                }
            });

            if (existingProgramSiswa) {
                throw ErrorFactory.badRequest('Siswa sudah terdaftar di kelas program ini secara permanen');
            }

            // Gunakan transaction untuk memastikan data konsisten
            const result = await prisma.$transaction(async (tx) => {
                // Tambahkan siswa ke kelas pengganti
                const kelasPengganti = await tx.kelasPengganti.create({
                    data: {
                        kelasProgramId,
                        siswaId,
                        tanggal,
                        isTemp: true,
                        count: 1
                    },
                    include: {
                        siswa: {
                            select: {
                                id: true,
                                namaMurid: true,
                                nis: true
                            }
                        },
                        kelasProgram: {
                            include: {
                                program: {
                                    select: {
                                        namaProgram: true
                                    }
                                },
                                jamMengajar: {
                                    select: {
                                        jamMulai: true,
                                        jamSelesai: true
                                    }
                                }
                            }
                        }
                    }
                });

                // Cek apakah absensi sudah ada
                const existingAbsensi = await tx.absensiSiswa.findFirst({
                    where: {
                        kelasProgramId,
                        siswaId,
                        tanggal
                    }
                });

                // Buat absensi jika belum ada
                if (!existingAbsensi) {
                    await tx.absensiSiswa.create({
                        data: {
                            kelasProgramId,
                            siswaId,
                            tanggal,
                            statusKehadiran: 'TIDAK_HADIR' // Status default, guru bisa ubah nanti
                        }
                    });
                }

                return kelasPengganti;
            });


            return {
                id: result.id,
                siswaId: result.siswa.id,
                namaSiswa: result.siswa.namaMurid,
                nis: result.siswa.nis,
                tanggal: result.tanggal,
                namaProgram: result.kelasProgram.program.namaProgram,
                jamMengajar: {
                    jamMulai: result.kelasProgram.jamMengajar.jamMulai,
                    jamSelesai: result.kelasProgram.jamMengajar.jamSelesai
                },
                absensiCreated: true
            };
        } catch (error) {
            logger.error(error);
      throw error;
        }
    }

    async removeKelasPengganti(options) {
        try {
            const { where } = options;
            const { guruId, kelasProgramId } = where;
            // Validasi bahwa kelas program ada
            const kelasProgram = await prisma.kelasProgram.findUnique({
                where: {
                    id: kelasProgramId
                }
            });

            if (!kelasProgram) {
                throw ErrorFactory.notFound(`Kelas program dengan ID ${kelasProgramId} tidak ditemukan`);
            }

            // Validasi bahwa guru berwenang untuk kelas program ini
            if (kelasProgram.guruId !== guruId) {
                throw ErrorFactory.notFound('Guru tidak berwenang untuk kelas program ini');
            }

            // Cari semua kelas pengganti yang aktif untuk kelas program ini
            const kelasPenggantiList = await prisma.kelasPengganti.findMany({
                where: {
                    kelasProgramId,
                    isTemp: true,
                    deletedAt: null // Hanya yang belum di soft delete
                },
                include: {
                    siswa: {
                        select: {
                            id: true,
                            namaMurid: true,
                            nis: true
                        }
                    }
                }
            });

            if (kelasPenggantiList.length === 0) {
                throw ErrorFactory.notFound('Tidak ada siswa dalam kelas pengganti untuk kelas program ini');
            }

            // Soft delete semua kelas pengganti untuk kelas program ini dan hapus absensinya
            const deletedIds = kelasPenggantiList.map(kp => kp.id);

            await prisma.$transaction(async (tx) => {
                // Soft delete kelas pengganti
                await tx.kelasPengganti.updateMany({
                    where: {
                        id: { in: deletedIds }
                    },
                    data: {
                        deletedAt: new Date(),
                        updatedAt: new Date()
                    }
                });

                // Hapus absensi siswa yang terkait
                for (const kp of kelasPenggantiList) {
                    await tx.absensiSiswa.deleteMany({
                        where: {
                            kelasProgramId,
                            siswaId: kp.siswaId,
                            tanggal: kp.tanggal
                        }
                    });
                }
            });


            return {
                message: `${kelasPenggantiList.length} siswa berhasil dihapus dari kelas pengganti`,
                kelasProgramId,
                totalDeleted: kelasPenggantiList.length,
                deletedStudents: kelasPenggantiList.map(kp => ({
                    siswaId: kp.siswaId,
                    namaSiswa: kp.siswa.namaMurid,
                    nis: kp.siswa.nis,
                    tanggal: kp.tanggal
                }))
            };
        } catch (error) {
            logger.error(error);
      throw error;
        }
    }

    async getSiswaKelasPengganti(options = {}) {
        try {
            const { filters = {} } = options;
            const { search, page = 1, limit = 10 } = filters;

            // Filter hanya siswa yang sudah memiliki kelas program aktif
            const whereClause = {
                programSiswa: {
                    some: {
                        status: 'AKTIF',
                        kelasProgramId: { not: null } // Harus sudah terdaftar di kelas program
                    }
                }
            };

            if (search) {
                whereClause.namaMurid = {
                    contains: search
                };
            }

            const siswa = await PrismaUtils.paginate(prisma.siswa, {
                limit,
                page,
                where: whereClause,
                select: {
                    id: true,
                    namaMurid: true,
                    nis: true,
                    programSiswa: {
                        where: {
                            status: 'AKTIF',
                            kelasProgramId: { not: null }
                        },
                        select: {
                            kelasProgram: {
                                select: {
                                    id: true,
                                    kelas: {
                                        select: {
                                            namaKelas: true
                                        }
                                    },
                                    program: {
                                        select: {
                                            namaProgram: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: [
                    { namaMurid: 'asc' }
                ]
            });

            // Transform data untuk menambahkan info kelas program
            const transformedData = {
                ...siswa,
                data: siswa.data.map(s => ({
                    siswaId: s.id,
                    namaSiswa: s.namaMurid,
                    NIS: s.nis,
                    kelasProgram: s.programSiswa.map(ps => ({
                        kelasProgramId: ps.kelasProgram.id,
                        namaKelas: ps.kelasProgram.kelas?.namaKelas || 'Tidak Ada Kelas',
                        namaProgram: ps.kelasProgram.program.namaProgram
                    }))
                }))
            };

            return transformedData;
        } catch (error) {
            logger.error(error);
      throw error;
        }
    }
}

module.exports = new KelasProgramService();
