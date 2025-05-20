const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');

class KelasProgramService {
    async getByKelasId(kelasId, filters = {}) {
        try {
            const { page = 1, limit = 10, hari, programId } = filters;

            // Validate kelas exists
            const kelas = await prisma.kelas.findUnique({
                where: { id: kelasId }
            });

            if (!kelas) {
                throw new NotFoundError(`Kelas dengan ID ${kelasId} tidak ditemukan`);
            }

            // Build where clause
            const where = { kelasId };
            if (hari) {
                where.hari = hari;
            }
            if (programId) {
                where.programId = programId;
            }

            // Get paginated results
            return await PrismaUtils.paginate(prisma.kelasProgram, {
                page,
                limit,
                where,
                include: {
                    kelas: true,
                    program: true,
                    jamMengajar: true,
                    guru: {
                        select: {
                            id: true,
                            nama: true,
                            nip: true
                        }
                    },
                    _count: {
                        select: {
                            jadwalSiswa: true
                        }
                    }
                },
                orderBy: [
                    { hari: 'asc' },
                    { jamMengajar: { jamMulai: 'asc' } }
                ]
            });
        } catch (error) {
            logger.error(`Error getting kelas programs for kelas ID ${kelasId}:`, error);
            throw error;
        }
    }

    async getDetailById(id) {
        try {
            const kelasProgram = await prisma.kelasProgram.findUnique({
                where: { id },
                include: {
                    kelas: true,
                    program: true,
                    jamMengajar: true,
                    guru: {
                        select: {
                            id: true,
                            nama: true,
                            nip: true,
                            noWhatsapp: true
                        }
                    },
                    jadwalSiswa: {
                        include: {
                            programSiswa: {
                                include: {
                                    siswa: {
                                        select: {
                                            id: true,
                                            namaMurid: true,
                                            namaPanggilan: true,
                                            jenisKelamin: true,
                                            strataPendidikan: true,
                                            kelasSekolah: true,
                                            namaSekolah: true,
                                            user: {
                                                select: {
                                                    email: true
                                                }
                                            }
                                        }
                                    },
                                    program: true
                                }
                            }
                        }
                    }
                }
            });

            if (!kelasProgram) {
                throw new NotFoundError(`Kelas program dengan ID ${id} tidak ditemukan`);
            }

            // Extract enrolled students with their details
            const siswaList = kelasProgram.jadwalSiswa.map(jadwal => ({
                jadwalSiswaId: jadwal.id,
                programSiswaId: jadwal.programSiswaId,
                siswa: jadwal.programSiswa.siswa,
                programSiswa: {
                    id: jadwal.programSiswa.id,
                    status: jadwal.programSiswa.status,
                    program: jadwal.programSiswa.program
                }
            }));

            return {
                kelasProgram: {
                    id: kelasProgram.id,
                    hari: kelasProgram.hari,
                    tipeKelas: kelasProgram.tipeKelas,
                    kelas: kelasProgram.kelas,
                    program: kelasProgram.program,
                    jamMengajar: kelasProgram.jamMengajar,
                    guru: kelasProgram.guru,
                    createdAt: kelasProgram.createdAt,
                    updatedAt: kelasProgram.updatedAt
                },
                siswaList,
                totalSiswa: siswaList.length
            };
        } catch (error) {
            logger.error(`Error getting kelas program detail for ID ${id}:`, error);
            throw error;
        }
    }

    async updateKelasProgramDetail(id, data) {
        try {
            const kelasProgram = await prisma.kelasProgram.findUnique({
                where: { id },
                include: {
                    jadwalSiswa: true
                }
            });

            if (!kelasProgram) {
                throw new NotFoundError(`Kelas program dengan ID ${id} tidak ditemukan`);
            }

            const {
                kelasId,
                programId,
                jamMengajarId,
                hari,
                guruId,
                tipeKelas,
                siswaListUpdates
            } = data;

            return await PrismaUtils.transaction(async (tx) => {
                // Update the kelas program
                const updatedKelasProgram = await tx.kelasProgram.update({
                    where: { id },
                    data: {
                        kelasId,
                        programId,
                        jamMengajarId,
                        hari,
                        guruId,
                        tipeKelas
                    },
                    include: {
                        kelas: true,
                        program: true,
                        jamMengajar: true,
                        guru: {
                            select: {
                                id: true,
                                nama: true,
                                nip: true
                            }
                        }
                    }
                });

                // Handle student updates if provided
                if (siswaListUpdates && siswaListUpdates.length > 0) {
                    // Process student additions and removals
                    for (const update of siswaListUpdates) {
                        const { action, jadwalSiswaId, programSiswaId } = update;

                        if (action === 'REMOVE' && jadwalSiswaId) {
                            // Remove student from this class
                            await tx.jadwalSiswa.delete({
                                where: { id: jadwalSiswaId }
                            });
                        } else if (action === 'ADD' && programSiswaId) {
                            // Check if student is already in this class
                            const existingJadwal = await tx.jadwalSiswa.findFirst({
                                where: {
                                    programSiswaId,
                                    kelasProgramId: id
                                }
                            });

                            if (!existingJadwal) {
                                // Add student to this class
                                await tx.jadwalSiswa.create({
                                    data: {
                                        programSiswaId,
                                        kelasProgramId: id
                                    }
                                });
                            }
                        }
                    }
                }

                // Get updated student list
                const updatedData = await this.getDetailById(id);

                logger.info(`Updated kelas program with ID: ${id}`);
                return updatedData;
            });
        } catch (error) {
            logger.error(`Error updating kelas program with ID ${id}:`, error);
            throw error;
        }
    }
}

module.exports = new KelasProgramService(); 