const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');

class AbsensiCronService {
    static async createDailyAbsensiGuru() {
        try {
            const today = new Date();
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const currentDay = days[today.getDay()];

            // Format date to DD-MM-YYYY
            const formattedDate = today.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).split('/').reverse().join('-');

            const kelasPrograms = await prisma.kelasProgram.findMany({
                where: {
                    hari: currentDay
                },
                include: {
                    guru: true
                }
            });

            if (kelasPrograms.length === 0) {
                logger.info(`No classes scheduled for ${currentDay}`);
                return { message: `No classes scheduled for ${currentDay}` };
            }

            // Create attendance records for each class
            const createdRecords = await Promise.all(
                kelasPrograms.map(async (kelasProgram) => {
                    // Check if attendance record already exists
                    const existingRecord = await prisma.absensiGuru.findFirst({
                        where: {
                            tanggal: formattedDate,
                            guruId: kelasProgram.guruId,
                            kelasProgramId: kelasProgram.id
                        }
                    });

                    if (existingRecord) {
                        logger.info(`Attendance record already exists for guru ${kelasProgram.guru.nama} on ${formattedDate}`);
                        return null;
                    }

                    // Create new attendance record
                    const absensiRecord = await prisma.absensiGuru.create({
                        data: {
                            tanggal: formattedDate,
                            statusKehadiran: 'TIDAK_HADIR',
                            jamMasuk: null,
                            jamKeluar: null,
                            sks: kelasProgram.sks || 0,
                            guruId: kelasProgram.guruId,
                            kelasProgramId: kelasProgram.id
                        },
                        include: {
                            guru: {
                                select: {
                                    nama: true
                                }
                            }
                        }
                    });

                    logger.info(`Created attendance record for guru ${absensiRecord.guru.nama} on ${formattedDate}`);
                    return absensiRecord;
                })
            );

            const successfulRecords = createdRecords.filter(record => record !== null);

            return {
                message: `Created ${successfulRecords.length} attendance records for ${currentDay}`,
                records: successfulRecords
            };
        } catch (error) {
            logger.error('Error creating daily guru attendance:', error);
            throw error;
        }
    }
}

module.exports = AbsensiCronService; 