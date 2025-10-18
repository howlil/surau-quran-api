const prisma  = require('../../lib/config/prisma.config');
const moment = require('moment');
const CommonServiceUtils = require('../../lib/utils/common.service.utils');
const logger = require('../../lib/config/logger.config');

class AbsensiCronService {
    static async createDailyAbsensiGuru() {
        const formattedDate = CommonServiceUtils.getCurrentDate();

        // Get current day in Indonesian
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const currentDay = days[moment().day()];

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
            return { message: 'No classes scheduled for today (Sunday)' };
        }


        const kelasPrograms = await prisma.kelasProgram.findMany({
            where: {
                hari: prismaDay
            },
            include: {
                guru: true
            }
        });

        if (!kelasPrograms.length) {
            return { message: `No classes found for ${currentDay}` };
        }


        const absensiRecords = [];

        for (const kelasProgram of kelasPrograms) {
            if (!kelasProgram.guru) {
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

        }

        return {
            message: `Created ${absensiRecords.length} attendance records for ${currentDay}`,
            records: absensiRecords
        };
    }

    static async createDailyAbsensiSiswa() {
        const formattedDate = CommonServiceUtils.getCurrentDate();

        // Get current day in Indonesian
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const currentDay = days[moment().day()];

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
            return { message: 'No classes scheduled for today (Sunday)' };
        }


        const kelasPrograms = await prisma.kelasProgram.findMany({
            where: {
                hari: prismaDay
            },
            include: {
                programSiswa: {
                    where: {
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
                },
                kelasPengganti: {
                    where: {
                        tanggal: formattedDate,
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
                }
            }
        });

        if (!kelasPrograms.length) {
            return { message: `No classes found for ${currentDay}` };
        }


        const absensiRecords = [];

        for (const kelasProgram of kelasPrograms) {
            // Get all active students in this class
            const activeSiswa = kelasProgram.programSiswa || [];

            // Get substitute students for today
            const substituteSiswa = kelasProgram.kelasPengganti || [];

            // Combine regular and substitute students
            const allSiswa = [
                ...activeSiswa.map(ps => ({
                    siswaId: ps.siswa.id,
                    namaSiswa: ps.siswa.namaMurid,
                    nis: ps.siswa.nis,
                    isKelasPengganti: false
                })),
                ...substituteSiswa.map(kp => ({
                    siswaId: kp.siswa.id,
                    namaSiswa: kp.siswa.namaMurid,
                    nis: kp.siswa.nis,
                    isKelasPengganti: true
                }))
            ];

            if (allSiswa.length === 0) {
                continue;
            }

            for (const siswa of allSiswa) {
                // Check if attendance record already exists
                const existingAbsensi = await prisma.absensiSiswa.findFirst({
                    where: {
                        kelasProgramId: kelasProgram.id,
                        siswaId: siswa.siswaId,
                        tanggal: formattedDate
                    }
                });

                if (existingAbsensi) {
                    continue;
                }

                const absensi = await prisma.absensiSiswa.create({
                    data: {
                        kelasProgramId: kelasProgram.id,
                        siswaId: siswa.siswaId,
                        tanggal: formattedDate,
                        statusKehadiran: 'TIDAK_HADIR'
                    }
                });

                absensiRecords.push({
                    id: absensi.id,
                    kelasProgramId: absensi.kelasProgramId,
                    siswaId: absensi.siswaId,
                    namaSiswa: siswa.namaSiswa,
                    nis: siswa.nis,
                    isKelasPengganti: siswa.isKelasPengganti,
                    tanggal: absensi.tanggal,
                    statusKehadiran: absensi.statusKehadiran
                });

            }
        }

        return {
            message: `Created ${absensiRecords.length} student attendance records for ${currentDay}`,
            records: absensiRecords
        };
    }
}

module.exports = AbsensiCronService; 