const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');

class KelasService {
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
                            }
                        }
                    }
                }
            });


            const result = kelasList.map(kelas => ({
                kelasId: kelas.id,
                namaKelas: kelas.namaKelas,
                ipAddressHikvision: kelas.ipAddressHikvision,
                program: kelas.kelasProgram.map(kp => ({
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
                    siswa: kp.programSiswa
                        .filter(ps => ps.status === 'AKTIF' && ps.isVerified === true)
                        .map(ps => ({
                            siswaId: ps.siswa.id,
                            namaSiswa: ps.siswa.namaMurid,
                            NIS: ps.siswa.nis
                        }))
                }))
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
                tambahSiswaIds = []
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

                let updatedKelasProgram = existingKelasProgram;
                if (Object.keys(updateData).length > 0) {
                    updatedKelasProgram = await tx.kelasProgram.update({
                        where: { id: kelasProgramId },
                        data: updateData
                    });
                }

                // Handle student updates
                let siswaDitambah = [];
                if (tambahSiswaIds.length > 0) {
                    // Find eligible students that are already verified in the program
                    const programSiswaList = await tx.programSiswa.findMany({
                        where: {
                            siswaId: { in: tambahSiswaIds },
                            status: 'AKTIF',
                            programId: updatedKelasProgram.programId
                        },
                        include: {
                            siswa: true
                        }
                    });

                    logger.info('Found eligible students:', {
                        count: programSiswaList.length,
                        students: programSiswaList.map(ps => ({
                            siswaId: ps.siswa.id,
                            namaSiswa: ps.siswa.namaMurid
                        }))
                    });

                    // Update each programSiswa record
                    for (const ps of programSiswaList) {
                        const updatedPs = await tx.programSiswa.update({
                            where: { id: ps.id },
                            data: {
                                kelasProgramId: kelasProgramId,
                                isVerified: true
                            }
                        });

                        siswaDitambah.push({
                            siswaId: ps.siswa.id,
                            namaSiswa: ps.siswa.namaMurid,
                            NIS: ps.siswa.nis
                        });
                    }
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

                // Process student assignments
                const processedSiswa = [];
                if (siswaIds.length > 0) {
                    // Find eligible students that are already verified in the program
                    const eligibleProgramSiswa = await tx.programSiswa.findMany({
                        where: {
                            siswaId: { in: siswaIds },
                            programId,
                            status: 'AKTIF'
                        },
                        include: {
                            siswa: true
                        }
                    });

                    logger.info('Found eligible students:', {
                        count: eligibleProgramSiswa.length,
                        students: eligibleProgramSiswa.map(ps => ({
                            siswaId: ps.siswa.id,
                            namaSiswa: ps.siswa.namaMurid
                        }))
                    });

                    // Update each programSiswa record
                    for (const ps of eligibleProgramSiswa) {
                        const updatedPs = await tx.programSiswa.update({
                            where: { id: ps.id },
                            data: {
                                kelasProgramId: kelasProgram.id,
                                isVerified: true
                            }
                        });

                        processedSiswa.push({
                            siswaId: ps.siswa.id,
                            namaSiswa: ps.siswa.namaMurid,
                            NIS: ps.siswa.nis
                        });
                    }
                }

                logger.info(`Created kelas program with ID: ${kelasProgram.id}`);

                return {
                    id: kelasProgram.id,
                    kelasId: kelasProgram.kelasId,
                    programId: kelasProgram.programId,
                    hari: kelasProgram.hari,
                    jamMengajarId: kelasProgram.jamMengajarId,
                    guruId: kelasProgram.guruId,
                    tipeKelas: kelasProgram.tipeKelas,
                    siswaYangDitambahkan: processedSiswa
                };
            });
        } catch (error) {
            logger.error('Error creating kelas program:', error);
            throw error;
        }
    }

    async getAllProgramSiswaBasedOnProgramId(programId) {
        try {
            const programSiswaList = await prisma.programSiswa.findMany({
                where: {
                    programId,
                    status: 'AKTIF',
                    kelasProgramId: null,
                },
                include: {
                    siswa: {
                        select: {
                            id: true,
                            namaMurid: true,
                            nis: true
                        }
                    },
                    JadwalProgramSiswa: {
                        include: {
                            jamMengajar: {
                                select: {
                                    id: true,
                                    jamMulai: true,
                                    jamSelesai: true
                                }
                            }
                        }
                    }
                }
            });

            const groupedBySchedule = {};

            programSiswaList.forEach(ps => {
                ps.JadwalProgramSiswa.forEach(jadwal => {
                    const key = `${jadwal.hari}_${jadwal.jamMengajarId}`;

                    if (!groupedBySchedule[key]) {
                        groupedBySchedule[key] = {
                            hari: jadwal.hari,
                            jamMengajar: jadwal.jamMengajar,
                            siswa: []
                        };
                    }

                    groupedBySchedule[key].siswa.push({
                        siswaId: ps.siswa.id,
                        namaSiswa: ps.siswa.namaMurid,
                        NIS: ps.siswa.nis
                    });
                });
            });

            return Object.values(groupedBySchedule);
        } catch (error) {
            logger.error('Error getting program siswa based on program ID:', error);
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
                        isVerified: false
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

    async getCCTVByKelasId(siswaUserId, kelasId) {
        try {
            // 1. Cari siswa berdasarkan user ID
            const siswa = await prisma.siswa.findUnique({
                where: { userId: siswaUserId }
            });

            if (!siswa) {
                throw new NotFoundError('Profil siswa tidak ditemukan');
            }

            // 2. Cari program yang diikuti siswa yang masih aktif
            const programSiswa = await prisma.programSiswa.findMany({
                where: {
                    siswaId: siswa.id,
                    status: 'AKTIF'
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
                throw new NotFoundError('Siswa tidak terdaftar dalam program apapun');
            }

            const programIds = programSiswa.map(ps => ps.programId);

            // 3. Cari kelas program yang sesuai dengan kelasId dan program yang diikuti siswa
            const kelasProgram = await prisma.kelasProgram.findFirst({
                where: {
                    kelasId: kelasId,
                    programId: { in: programIds }
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
                            namaProgram: true
                        }
                    }
                }
            });

            if (!kelasProgram) {
                throw new NotFoundError('Siswa tidak memiliki akses ke CCTV kelas ini');
            }

            // 4. Validasi bahwa siswa benar-benar ter-enroll di kelas program ini
            const enrolledProgramSiswa = await prisma.programSiswa.findFirst({
                where: {
                    siswaId: siswa.id,
                    programId: kelasProgram.programId,
                    status: 'AKTIF'
                }
            });

            if (!enrolledProgramSiswa) {
                throw new NotFoundError('Siswa tidak ter-enroll dalam program di kelas ini');
            }

            // 5. Return IP address CCTV
            if (!kelasProgram.kelas.ipAddressHikvision) {
                throw new NotFoundError('CCTV tidak tersedia untuk kelas ini');
            }

            logger.info(`CCTV access granted for siswa ID: ${siswa.id} to kelas ID: ${kelasId}`);

            return {
                cctvIP: kelasProgram.kelas.ipAddressHikvision
            };
        } catch (error) {
            logger.error(`Error getting CCTV for siswa user ID ${siswaUserId} and kelas ID ${kelasId}:`, error);
            throw error;
        }
    }
}

module.exports = new KelasService();