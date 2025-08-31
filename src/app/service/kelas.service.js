const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError, BadRequestError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');

class KelasService {

    // Helper method untuk mengecek konflik jadwal guru
    async checkGuruScheduleConflict(tx, guruId, hari, jamMengajarId, excludeKelasProgramId = null) {
        if (!guruId) return false;

        const whereClause = {
            guruId,
            hari,
            jamMengajarId
        };

        // Exclude kelas program yang sedang diupdate (untuk patch operation)
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

            throw new ConflictError(
                `Guru sudah memiliki jadwal mengajar pada ${conflictInfo.hari} jam ${conflictInfo.jam} ` +
                `untuk program ${conflictInfo.program} di kelas ${conflictInfo.kelas}. ` +
                `Satu guru tidak dapat mengajar di jam yang sama pada hari yang sama.`
            );
        }

        return false;
    }

    async create(data) {
        try {
            const existing = await prisma.kelas.findFirst({
                where: { namaKelas: data.namaKelas }
            });

            if (existing) {
                throw new ConflictError(`Kelas dengan nama ${data.namaKelas} sudah ada`);
            }

            const kelas = await prisma.kelas.create({
                data
            });

            logger.info(`Created kelas with ID: ${kelas.id}`);
            return kelas;
        } catch (error) {
            logger.error('Error creating kelas:', error);
            throw error;
        }
    }

    async update(id, data) {
        try {
            const kelas = await prisma.kelas.findUnique({
                where: { id }
            });

            if (!kelas) {
                throw new NotFoundError(`Kelas dengan ID ${id} tidak ditemukan`);
            }

            if (data.namaKelas && data.namaKelas !== kelas.namaKelas) {
                const existing = await prisma.kelas.findFirst({
                    where: {
                        namaKelas: data.namaKelas,
                        id: { not: id }
                    }
                });

                if (existing) {
                    throw new ConflictError(`Kelas dengan nama ${data.namaKelas} sudah ada`);
                }
            }

            const updated = await prisma.kelas.update({
                where: { id },
                data
            });

            logger.info(`Updated kelas with ID: ${id}`);
            return updated;
        } catch (error) {
            logger.error(`Error updating kelas with ID ${id}:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            const kelas = await prisma.kelas.findUnique({
                where: { id }
            });

            if (!kelas) {
                throw new NotFoundError(`Kelas dengan ID ${id} tidak ditemukan`);
            }

            // Check if kelas is being used in KelasProgram
            const kelasProgram = await prisma.kelasProgram.findFirst({
                where: { kelasId: id }
            });

            if (kelasProgram) {
                throw new ConflictError('Kelas sedang digunakan dalam program kelas dan tidak dapat dihapus');
            }

            await prisma.kelas.delete({
                where: { id }
            });

            logger.info(`Deleted kelas with ID: ${id}`);
            return { id };
        } catch (error) {
            logger.error(`Error deleting kelas with ID ${id}:`, error);
            throw error;
        }
    }

    async getAll() {
        try {
            const kelasList = await prisma.kelas.findMany({
                select: {
                    id: true,
                    namaKelas: true,
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return kelasList;
        } catch (error) {
            logger.error('Error getting all kelas:', error);
            throw error;
        }
    }

    async getInitialStudentIntoClass() {
        try {
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
            logger.error('Error getting initial student into class:', err);
            throw err;
        }
    }


    async patchInitialStudentIntoClass(kelasProgramId, data) {
        try {
            const {
                programId,
                hari,
                jamMengajarId,
                guruId,
                tambahSiswaIds = [],
                hapusSiswaIds = []
            } = data;

            return await PrismaUtils.transaction(async (tx) => {
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
                    throw new NotFoundError(`Kelas program dengan ID ${kelasProgramId} tidak ditemukan`);
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
                    logger.info('Detected metadata-only update, skipping student management operations');
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

                        logger.info(`Successfully removed ${siswaDihapus.length} students from class ${kelasProgramId}`);
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
                        throw new NotFoundError('Program tidak ditemukan');
                    }

                    let programSiswaList;

                    if (program.tipeProgram === 'PRIVATE') {
                        // Untuk program private, siswa harus memiliki keluargaId yang sama
                        // Ambil keluargaId dari siswa pertama yang dipilih
                        const firstSiswa = await tx.siswa.findUnique({
                            where: { id: tambahSiswaIds[0] },
                            select: { keluargaId: true }
                        });

                        if (!firstSiswa || !firstSiswa.keluargaId) {
                            throw new BadRequestError('Siswa pertama harus memiliki keluargaId untuk program private');
                        }

                        // Cari semua siswa yang memiliki keluargaId yang sama
                        programSiswaList = await tx.programSiswa.findMany({
                            where: {
                                siswaId: { in: tambahSiswaIds },
                                status: 'AKTIF',
                                programId: updatedKelasProgram.programId,
                                kelasProgramId: null, // Hanya siswa yang belum terdaftar di kelas program manapun
                                siswa: {
                                    keluargaId: firstSiswa.keluargaId // Hanya siswa dengan keluargaId yang sama
                                }
                            },
                            include: {
                                siswa: true
                            }
                        });

                        logger.info(`Private program detected. Found ${programSiswaList.length} students with keluargaId: ${firstSiswa.keluargaId}`);
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

                        throw new ConflictError(`Beberapa siswa sudah terdaftar di kelas program lain: ${conflictDetails.map(s => s.namaSiswa).join(', ')}`);
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

                        throw new ConflictError(`Beberapa siswa sudah terdaftar di kelas program ini: ${alreadyInClassDetails.map(s => s.namaSiswa).join(', ')}`);
                    }

                    // Check if any students don't exist in the program
                    const foundSiswaIds = programSiswaList.map(ps => ps.siswaId);
                    const notFoundSiswaIds = tambahSiswaIds.filter(id => !foundSiswaIds.includes(id));

                    if (notFoundSiswaIds.length > 0) {
                        const notFoundStudents = await tx.siswa.findMany({
                            where: { id: { in: notFoundSiswaIds } },
                            select: { id: true, namaMurid: true, nis: true }
                        });

                        throw new NotFoundError(`Beberapa siswa tidak ditemukan dalam program ini: ${notFoundStudents.map(s => s.namaMurid).join(', ')}`);
                    }

                    // Batch update programSiswa
                    const ids = programSiswaList.map(ps => ps.id);
                    if (ids.length > 0) {
                        await tx.programSiswa.updateMany({
                            where: { id: { in: ids } },
                            data: { kelasProgramId: kelasProgramId }
                        });

                        logger.info(`Successfully added ${ids.length} students to class ${kelasProgramId}`);
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
            logger.error('Error in initialStudentIntoClass:', err);
            throw err;
        }
    }

    async createKelasProgram(data) {
        try {
            const { kelasId, programId, hari, jamMengajarId, guruId, siswaIds = [] } = data;

            return await PrismaUtils.transaction(async (tx) => {
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
                    throw new ConflictError('Kelas program dengan kombinasi ini sudah ada');
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
                    throw new NotFoundError('Program tidak ditemukan');
                }

                // Process student assignments
                const processedSiswa = [];
                if (siswaIds.length > 0) {
                    let eligibleProgramSiswa;

                    if (program.tipeProgram === 'PRIVATE') {
                        // Untuk program private, siswa harus memiliki keluargaId yang sama
                        // Ambil keluargaId dari siswa pertama yang dipilih
                        const firstSiswa = await tx.siswa.findUnique({
                            where: { id: siswaIds[0] },
                            select: { keluargaId: true }
                        });

                        if (!firstSiswa || !firstSiswa.keluargaId) {
                            throw new BadRequestError('Siswa pertama harus memiliki keluargaId untuk program private');
                        }

                        // Cari semua siswa yang memiliki keluargaId yang sama
                        eligibleProgramSiswa = await tx.programSiswa.findMany({
                            where: {
                                siswaId: { in: siswaIds },
                                programId,
                                status: 'AKTIF',
                                kelasProgramId: null, // Hanya siswa yang belum terdaftar di kelas program lain
                                siswa: {
                                    keluargaId: firstSiswa.keluargaId // Hanya siswa dengan keluargaId yang sama
                                }
                            },
                            include: {
                                siswa: true
                            }
                        });

                        logger.info(`Private program detected. Found ${eligibleProgramSiswa.length} students with keluargaId: ${firstSiswa.keluargaId}`);
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

                    logger.info('Found eligible students:', {
                        count: eligibleProgramSiswa.length,
                        programType: program.tipeProgram,
                        students: eligibleProgramSiswa.map(ps => ({
                            siswaId: ps.siswa.id,
                            namaSiswa: ps.siswa.namaMurid,
                            keluargaId: ps.siswa.keluargaId
                        }))
                    });

                    // Batch update programSiswa
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

                logger.info(`Created kelas program with ID: ${kelasProgram.id}`);

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
            logger.error('Error creating kelas program:', error);
            throw error;
        }
    }

    async deleteKelasProgram(kelasProgramId) {
        try {
            const kelasProgram = await prisma.kelasProgram.findUnique({
                where: { id: kelasProgramId },
                include: {
                    programSiswa: {
                        where: { status: 'AKTIF' }
                    }
                }
            });

            if (!kelasProgram) {
                throw new NotFoundError(`Kelas program dengan ID ${kelasProgramId} tidak ditemukan`);
            }

            if (kelasProgram.programSiswa.length > 0) {
                throw new ConflictError('Kelas program ini memiliki siswa yang terdaftar dan tidak dapat dihapus');
            }

            // Use transaction to ensure data consistency
            await PrismaUtils.transaction(async (tx) => {
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

            logger.info(`Deleted kelas program with ID: ${kelasProgramId}`);
            return { kelasProgramId };
        } catch (error) {
            logger.error(`Error deleting kelas program with ID ${kelasProgramId}:`, error);
            throw error;
        }
    }

    async getCCTVByUserId(siswaUserId) {
        try {
            // 1. Cari siswa berdasarkan user ID
            const siswa = await prisma.siswa.findUnique({
                where: { userId: siswaUserId }
            });

            if (!siswa) {
                throw new NotFoundError('Profil siswa tidak ditemukan');
            }

            // 2. Cari program siswa yang masih aktif dan ter-enroll di kelas program
            const programSiswa = await prisma.programSiswa.findMany({
                where: {
                    siswaId: siswa.id,
                    status: 'AKTIF',
                    kelasProgramId: { not: null } // Hanya yang sudah ter-enroll di kelas
                },
                include: {
                    program: {
                        select: {
                            id: true,
                            namaProgram: true
                        }
                    }
                }
            });

            if (programSiswa.length === 0) {
                throw new NotFoundError('Siswa tidak terdaftar dalam kelas program apapun');
            }

            const kelasProgramIds = programSiswa.map(ps => ps.kelasProgramId);

            // 3. Cari semua kelas program yang berkaitan dengan siswa dan memiliki CCTV
            const kelasPrograms = await prisma.kelasProgram.findMany({
                where: {
                    id: { in: kelasProgramIds },
                    kelas: {
                        ipAddressHikvision: { not: null } // Hanya kelas yang memiliki CCTV
                    }
                },
                include: {
                    kelas: {
                        select: {
                            id: true,
                            namaKelas: true,
                            ipAddressHikvision: true
                        }
                    },
                    program: {
                        select: {
                            id: true,
                            namaProgram: true
                        }
                    },
                    jamMengajar: {
                        select: {
                            jamMulai: true,
                            jamSelesai: true
                        }
                    }
                },
                orderBy: [
                    { kelas: { namaKelas: 'asc' } },
                    { program: { namaProgram: 'asc' } }
                ]
            });

            if (kelasPrograms.length === 0) {
                throw new NotFoundError('Tidak ada kelas dengan CCTV yang dapat diakses siswa ini');
            }

            // 4. Format response dengan informasi lengkap
            const cctvList = kelasPrograms.map(kp => ({
                kelasId: kp.kelas.id,
                namaKelas: kp.kelas.namaKelas,
                programId: kp.program.id,
                namaProgram: kp.program.namaProgram,
                hari: kp.hari,
                jamMengajar: {
                    jamMulai: kp.jamMengajar.jamMulai,
                    jamSelesai: kp.jamMengajar.jamSelesai
                },
                cctvIP: kp.kelas.ipAddressHikvision
            }));

            logger.info(`CCTV access granted for siswa ID: ${siswa.id}, found ${cctvList.length} accessible CCTV(s)`);

            return {
                siswaId: siswa.id,
                namaSiswa: siswa.namaMurid,
                totalCCTV: cctvList.length,
                cctvList
            };
        } catch (error) {
            logger.error(`Error getting CCTV for siswa user ID ${siswaUserId}:`, error);
            throw error;
        }
    }
}

module.exports = new KelasService();