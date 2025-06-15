const { prisma } = require('../../generated/prisma');
const { logger } = require('../../lib/config/logger.config');

class AbsensiCronService {
    static async createDailyAbsensiGuru() {
        const today = new Date();
        const formattedDate = today.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).split('/').reverse().join('-');

        // Get current day in Indonesian
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const currentDay = days[today.getDay()];

        // Map Indonesian day names to Prisma enum values
        const dayMapping = {
            'Senin': 'SENIN',
            'Selasa': 'SELASA',
            'Rabu': 'RABU',
            'Kamis': 'KAMIS',
            'Jumat': 'JUMAT',
            'Sabtu': 'SABTU'
        };

        const prismaDay = dayMapping[currentDay];
        if (!prismaDay) {
            logger.warn('No classes scheduled for today (Sunday)');
            return { message: 'No classes scheduled for today (Sunday)' };
        }

        logger.info(`Creating attendance records for ${currentDay} (${formattedDate})`);

        const kelasPrograms = await prisma.kelasProgram.findMany({
            where: {
                hari: prismaDay
            },
            include: {
                guru: true
            }
        });

        if (!kelasPrograms.length) {
            logger.warn(`No classes found for ${currentDay}`);
            return { message: `No classes found for ${currentDay}` };
        }

        logger.info(`Found ${kelasPrograms.length} classes for ${currentDay}`);

        const absensiRecords = [];

        for (const kelasProgram of kelasPrograms) {
            if (!kelasProgram.guru) {
                logger.warn(`No teacher assigned to class ${kelasProgram.id}`);
                continue;
            }

            // Check if attendance record already exists
            const existingAbsensi = await prisma.absensiGuru.findFirst({
                where: {
                    kelasProgramId: kelasProgram.id,
                    tanggal: formattedDate
                }
            });

            if (existingAbsensi) {
                logger.info(`Attendance record already exists for class ${kelasProgram.id} on ${formattedDate}`);
                continue;
            }

            const absensi = await prisma.absensiGuru.create({
                data: {
                    kelasProgramId: kelasProgram.id,
                    guruId: kelasProgram.guruId,
                    tanggal: formattedDate,
                    statusKehadiran: 'TIDAK_HADIR',
                    sks: 0
                }
            });

            absensiRecords.push({
                id: absensi.id,
                kelasProgramId: absensi.kelasProgramId,
                guruId: absensi.guruId,
                tanggal: absensi.tanggal,
                statusKehadiran: absensi.statusKehadiran
            });

            logger.info(`Created attendance record for teacher ${kelasProgram.guru.nama} in class ${kelasProgram.id}`);
        }

        return {
            message: `Created ${absensiRecords.length} attendance records for ${currentDay}`,
            records: absensiRecords
        };
    }
}

module.exports = AbsensiCronService; 