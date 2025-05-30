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
                    namaKelas: true
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

            const updateData = {};
            if (programId) updateData.programId = programId;
            if (hari) updateData.hari = hari;
            if (jamMengajarId) updateData.jamMengajarId = jamMengajarId;
            if (guruId) updateData.guruId = guruId;

            let kelasProgram = null;
            await prisma.$transaction(async (tx) => {
                if (Object.keys(updateData).length > 0) {
                    kelasProgram = await tx.kelasProgram.update({
                        where: { id: kelasProgramId },
                        data: updateData
                    });
                } else {
                    kelasProgram = await tx.kelasProgram.findUnique({
                        where: { id: kelasProgramId }
                    });
                }

                // Proses penambahan siswa
                let siswaDitambah = [];
                if (tambahSiswaIds.length > 0) {
                    // Ambil programSiswa yang eligible
                    const programSiswaList = await tx.programSiswa.findMany({
                        where: {
                            siswaId: { in: tambahSiswaIds },
                            status: 'AKTIF',
                            programId: kelasProgram.programId,
                            kelasProgramId: null,
                            isVerified: false,
                            JadwalProgramSiswa: {
                                some: {
                                    hari: kelasProgram.hari,
                                    jamMengajarId: kelasProgram.jamMengajarId
                                }
                            }
                        },
                        include: { siswa: true }
                    });

                    for (const ps of programSiswaList) {
                        await tx.programSiswa.update({
                            where: { id: ps.id },
                            data: { kelasProgramId: kelasProgramId, isVerified: true }
                        });
                        siswaDitambah.push({
                            siswaId: ps.siswa.id,
                            namaSiswa: ps.siswa.namaMurid,
                            NIS: ps.siswa.nis
                        });
                    }
                }

                // Return response di luar $transaction agar keluar dari scope
                kelasProgram = {
                    ...kelasProgram,
                    siswaDitambah
                };
            });

            return {
                kelasProgramId,
                updateData,
                siswaDitambah: kelasProgram.siswaDitambah || []
            };

        } catch (err) {
            logger.error('Error in initialStudentIntoClass:', err);
            throw err;
        }
    }

async createKelasProgram(data) {
        try {
            const { kelasId, programId, hari, jamMengajarId, guruId, siswaIds = [] } = data;

            return await PrismaUtils.transaction(async (tx) => {
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

                const kelasProgram = await tx.kelasProgram.create({
                    data: {
                        kelasId,
                        programId,
                        hari,
                        jamMengajarId,
                        guruId
                    }
                });

                const processedSiswa = [];
                if (siswaIds.length > 0) {
                    const eligibleProgramSiswa = await tx.programSiswa.findMany({
                        where: {
                            siswaId: { in: siswaIds },
                            status: 'AKTIF',
                            programId,
                            kelasProgramId: null,
                            isVerified: false,
                            JadwalProgramSiswa: {
                                some: {
                                    hari,
                                    jamMengajarId
                                }
                            }
                        },
                        include: { siswa: true }
                    });

                    for (const ps of eligibleProgramSiswa) {
                        await tx.programSiswa.update({
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
                    ...kelasProgram,
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
                    isVerified: false
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
                where: { id: kelasProgramId }
            });
            if (!kelasProgram) {
                throw new NotFoundError(`Kelas program dengan ID ${kelasProgramId} tidak ditemukan`);
            }
            // Cek apakah kelas program ini memiliki siswa yang terdaftar
            const siswaCount = await prisma.programSiswa.count({
                where: { kelasProgramId }
            });
            if (siswaCount > 0) {
                throw new ConflictError('Kelas program ini memiliki siswa terdaftar dan tidak dapat dihapus');
            }


            await prisma.kelasProgram.delete({
                where: { id: kelasProgramId }
            });
        } catch (err) {
            logger.error('Error deleting kelas program:', err);
            throw err;
        }
    }

}

module.exports = new KelasService();