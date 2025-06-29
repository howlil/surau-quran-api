const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const moment = require('moment');
const { DATE_FORMATS } = require('../../lib/constants');

class SppCronService {
    static async createMonthlySpp() {
        try {
            const today = new Date();
            const currentDay = today.getDate();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();

            // Format date to DD-MM-YYYY
            const formattedDate = moment().format(DATE_FORMATS.DEFAULT);

            const programSiswa = await prisma.programSiswa.findMany({
                where: {
                    isActive: true,
                    kelasProgram: {
                        some: {}
                    }
                },
                include: {
                    siswa: true,
                    program: true,
                    kelasProgram: {
                        select: {
                            id: true,
                            programId: true
                        }
                    }
                }
            });

            if (programSiswa.length === 0) {
                logger.info('No active program siswa found');
                return { message: 'No active program siswa found' };
            }

            const createdRecords = await Promise.all(
                programSiswa.map(async (ps) => {
                    // Get registration date
                    const registrationDate = new Date(ps.createdAt);
                    const registrationDay = registrationDate.getDate();

                    // Only create SPP if it's the registration day of the month
                    if (registrationDay !== currentDay) {
                        return null;
                    }

                    // Check if SPP already exists for this month
                    const existingSpp = await prisma.periodeSpp.findFirst({
                        where: {
                            programSiswaId: ps.id,
                            bulan: this.getMonthName(currentMonth),
                            tahun: currentYear
                        }
                    });

                    if (existingSpp) {
                        logger.info(`SPP already exists for siswa ${ps.siswa.namaMurid} for ${this.getMonthName(currentMonth)} ${currentYear}`);
                        return null;
                    }

                    // Get program details for SPP amount
                    const program = await prisma.program.findUnique({
                        where: { id: ps.programId },
                        select: {
                            biayaSpp: true
                        }
                    });

                    if (!program) {
                        logger.error(`Program not found for ID ${ps.programId}`);
                        return null;
                    }

                    // Create SPP record
                    const sppRecord = await prisma.periodeSpp.create({
                        data: {
                            programSiswaId: ps.id,
                            bulan: this.getMonthName(currentMonth),
                            tahun: currentYear,
                            tanggalTagihan: formattedDate,
                            jumlahTagihan: program.biayaSpp,
                            diskon: 0,
                            totalTagihan: program.biayaSpp
                        },
                        include: {
                            programSiswa: {
                                include: {
                                    siswa: {
                                        select: {
                                            namaMurid: true
                                        }
                                    }
                                }
                            }
                        }
                    });

                    logger.info(`Created SPP for siswa ${sppRecord.programSiswa.siswa.namaMurid} for ${this.getMonthName(currentMonth)} ${currentYear}`);
                    return sppRecord;
                })
            );

            const successfulRecords = createdRecords.filter(record => record !== null);

            return {
                message: `Created ${successfulRecords.length} SPP records for ${this.getMonthName(currentMonth)} ${currentYear}`,
                records: successfulRecords
            };
        } catch (error) {
            logger.error('Error creating monthly SPP:', error);
            throw error;
        }
    }

    static getMonthName(month) {
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return months[month - 1];
    }
}

module.exports = SppCronService; 