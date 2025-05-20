const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ForbiddenError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');

class AbsensiService {
    // Get student attendance for admin (filtered by date)
    async getAbsensiSiswaForAdmin(filters = {}) {
        try {
            const { tanggal, page = 1, limit = 10 } = filters;

            const where = {};
            if (tanggal) {
                where.tanggal = tanggal;
            }

            return await PrismaUtils.paginate(prisma.absensiSiswa, {
                page,
                limit,
                where,
                include: {
                    kelasProgram: {
                        include: {
                            kelas: true,
                            program: true,
                            jamMengajar: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        } catch (error) {
            logger.error('Error getting siswa attendance:', error);
            throw error;
        }
    }

    // Get teacher attendance for admin (filtered by date)
    async getAbsensiGuruForAdmin(filters = {}) {
        try {
            const { tanggal, page = 1, limit = 10 } = filters;

            const where = {};
            if (tanggal) {
                where.tanggal = tanggal;
            }

            return await PrismaUtils.paginate(prisma.absensiGuru, {
                page,
                limit,
                where,
                include: {
                    kelasProgram: {
                        include: {
                            kelas: true,
                            program: true,
                            jamMengajar: true,
                            guru: {
                                select: {
                                    id: true,
                                    nama: true
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        } catch (error) {
            logger.error('Error getting guru attendance:', error);
            throw error;
        }
    }

    // Update teacher attendance
    async updateAbsensiGuru(id, data) {
        try {
            const absensi = await prisma.absensiGuru.findUnique({
                where: { id }
            });

            if (!absensi) {
                throw new NotFoundError(`Absensi guru dengan ID ${id} tidak ditemukan`);
            }

            // Format data
            const absensiData = {
                statusKehadiran: data.statusKehadiran,
                ...(data.jamMasuk && { jamMasuk: data.jamMasuk }),
                ...(data.jamKeluar && { jamKeluar: data.jamKeluar }),
                ...(data.suratIzin && { suratIzin: data.suratIzin })
            };

            const updated = await prisma.absensiGuru.update({
                where: { id },
                data: absensiData,
                include: {
                    kelasProgram: {
                        include: {
                            kelas: true,
                            program: true,
                            guru: {
                                select: {
                                    id: true,
                                    nama: true
                                }
                            }
                        }
                    }
                }
            });

            logger.info(`Updated guru attendance with ID: ${id}`);
            return updated;
        } catch (error) {
            logger.error(`Error updating guru attendance with ID ${id}:`, error);
            throw error;
        }
    }

    // Get student's attendance counts (absent, sick leave, permission)
    async getAbsensiCountForSiswa(siswaId) {
        try {
            // Verify siswa exists
            const siswa = await prisma.siswa.findUnique({
                where: { id: siswaId },
                include: {
                    programSiswa: {
                        include: {
                            jadwalSiswa: true
                        }
                    }
                }
            });

            if (!siswa) {
                throw new NotFoundError(`Siswa dengan ID ${siswaId} tidak ditemukan`);
            }

            // Get all kelas program IDs for this student
            const kelasProgramIds = siswa.programSiswa
                .flatMap(ps => ps.jadwalSiswa.map(js => js.kelasProgramId));

            // Get all attendance records for these kelas programs
            const absensiRecords = await prisma.absensiSiswa.findMany({
                where: {
                    kelasProgramId: {
                        in: kelasProgramIds
                    }
                }
            });

            // Count by status
            const counts = {
                TIDAK_HADIR: 0,
                IZIN: 0,
                SAKIT: 0,
                HADIR: 0,
                total: absensiRecords.length
            };

            absensiRecords.forEach(record => {
                counts[record.statusKehadiran]++;
            });

            return counts;
        } catch (error) {
            logger.error(`Error getting attendance counts for siswa ${siswaId}:`, error);
            throw error;
        }
    }

    // Get student's attendance details with monthly filter
    async getAbsensiDetailForSiswa(siswaId, filters = {}) {
        try {
            const { bulan, page = 1, limit = 10 } = filters;

            // Verify siswa exists
            const siswa = await prisma.siswa.findUnique({
                where: { id: siswaId },
                include: {
                    programSiswa: {
                        include: {
                            jadwalSiswa: true
                        }
                    }
                }
            });

            if (!siswa) {
                throw new NotFoundError(`Siswa dengan ID ${siswaId} tidak ditemukan`);
            }

            // Get all kelas program IDs for this student
            const kelasProgramIds = siswa.programSiswa
                .flatMap(ps => ps.jadwalSiswa.map(js => js.kelasProgramId));

            // Build where clause
            const where = {
                kelasProgramId: {
                    in: kelasProgramIds
                }
            };

            // Apply month filter if provided
            if (bulan) {
                where.tanggal = {
                    contains: `-${bulan}-` // Format: YYYY-MM-DD
                };
            }

            return await PrismaUtils.paginate(prisma.absensiSiswa, {
                page,
                limit,
                where,
                include: {
                    kelasProgram: {
                        include: {
                            kelas: true,
                            program: true,
                            jamMengajar: true
                        }
                    }
                },
                orderBy: { tanggal: 'desc' }
            });
        } catch (error) {
            logger.error(`Error getting attendance details for siswa ${siswaId}:`, error);
            throw error;
        }
    }

    // Teacher marks attendance for students in their class
    async markAbsensiSiswa(guruId, data) {
        try {
            const { kelasProgramId, tanggal, siswaAttendance } = data;

            // Verify the kelasProgram exists and belongs to the guru
            const kelasProgram = await prisma.kelasProgram.findUnique({
                where: {
                    id: kelasProgramId,
                    guruId: guruId
                },
                include: {
                    kelas: true,
                    program: true,
                    jadwalSiswa: {
                        include: {
                            programSiswa: {
                                include: {
                                    siswa: true
                                }
                            }
                        }
                    }
                }
            });

            if (!kelasProgram) {
                throw new ForbiddenError(`Anda tidak berwenang mengisi absensi untuk kelas program ini`);
            }

            // Verify all students are in this class
            const enrolledStudentIds = new Set(
                kelasProgram.jadwalSiswa.map(js => js.programSiswa.siswa.id)
            );

            for (const attendance of siswaAttendance) {
                if (!enrolledStudentIds.has(attendance.siswaId)) {
                    throw new NotFoundError(`Siswa dengan ID ${attendance.siswaId} tidak terdaftar di kelas ini`);
                }
            }

            return await PrismaUtils.transaction(async (tx) => {
                // Create or update attendance records for each student
                const absensiRecords = [];

                for (const attendance of siswaAttendance) {
                    // Check if attendance record already exists for this date and student
                    const existingRecord = await tx.absensiSiswa.findFirst({
                        where: {
                            kelasProgramId,
                            tanggal,
                            siswaId: attendance.siswaId
                        }
                    });

                    if (existingRecord) {
                        // Update existing record
                        const updated = await tx.absensiSiswa.update({
                            where: { id: existingRecord.id },
                            data: {
                                statusKehadiran: attendance.statusKehadiran
                            }
                        });
                        absensiRecords.push(updated);
                    } else {
                        // Create new record
                        const created = await tx.absensiSiswa.create({
                            data: {
                                kelasProgramId,
                                tanggal,
                                siswaId: attendance.siswaId,
                                statusKehadiran: attendance.statusKehadiran
                            }
                        });
                        absensiRecords.push(created);
                    }
                }

                logger.info(`Marked attendance for ${absensiRecords.length} students in class ${kelasProgramId}`);

                return {
                    kelasProgramId,
                    tanggal,
                    kelasInfo: {
                        kelas: kelasProgram.kelas?.namaKelas || 'Unknown',
                        program: kelasProgram.program?.namaProgram || 'Unknown'
                    },
                    totalStudents: absensiRecords.length,
                    absensiRecords
                };
            });
        } catch (error) {
            logger.error(`Error marking student attendance: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new AbsensiService();
