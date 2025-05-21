const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ForbiddenError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');

class AbsensiService {
    // Get student attendance for admin (filtered by date) - redesigned API

    // TODO : masih ada bug tanggal dan logicnya lihat lagi
    async getAbsensiSiswaForAdmin(filters = {}) {
        try {
            const { tanggal } = filters;

            // Get all kelasProgram entries that have attendance records for the given date
            const kelasPrograms = await prisma.kelasProgram.findMany({
                where: {
                    absensiSiswa: {
                        some: {
                            tanggal
                        }
                    }
                },
                include: {
                    kelas: true,
                    program: true,
                    jamMengajar: true,
                    absensiSiswa: {
                        where: {
                            tanggal
                        },
                        include: {
                            siswa: {
                                select: {
                                    namaMurid: true,
                                    nis: true
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Group by kelasId
            const kelasMap = new Map();

            kelasPrograms.forEach(kelasProgram => {
                const kelasId = kelasProgram.kelasId;
                const namaKelas = kelasProgram.kelas?.namaKelas || 'Tidak Ada Kelas';

                if (!kelasMap.has(kelasId)) {
                    kelasMap.set(kelasId, {
                        kelasId,
                        namaKelas,
                        tanggal,
                        program: []
                    });
                }

                // Get the class entry
                const kelasEntry = kelasMap.get(kelasId);

                // Format attendance data for this program
                const absensiData = kelasProgram.absensiSiswa.map(record => ({
                    namaSiswa: record.siswa.namaMurid,
                    nis: record.siswa.nis,
                    status: record.statusKehadiran
                }));

                // Add program info to the class entry
                kelasEntry.program.push({
                    programId: kelasProgram.programId,
                    namaProgram: kelasProgram.program.namaProgram,
                    hari: kelasProgram.hari,
                    jamMengajarId: kelasProgram.jamMengajarId,
                    jamMulai: kelasProgram.jamMengajar.jamMulai,
                    jamSelesai: kelasProgram.jamMengajar.jamSelesai,
                    absensi: absensiData
                });
            });

            // Convert the map to an array
            return Array.from(kelasMap.values());
        } catch (error) {
            logger.error('Error getting siswa attendance by kelas:', error);
            throw error;
        }
    }

    // TODO : samakana aha formatany dengan yg siswa 
    async getAbsensiGuruByDate(filters = {}) {
        try {
            const { tanggal } = filters;

            const where = {};
            if (tanggal) {
                where.tanggal = tanggal;
            }

            // Get all teacher attendance records filtered by date if provided
            const absensiRecords = await prisma.absensiGuru.findMany({
                where,
                include: {
                    guru: {
                        select: {
                            nama: true,
                            nip: true
                        }
                    }
                },
                orderBy: [
                    { tanggal: 'asc' },
                    { jamMasuk: 'asc' }
                ]
            });

            // Group attendance records by date
            const groupedByDate = {};

            absensiRecords.forEach(record => {
                if (!groupedByDate[record.tanggal]) {
                    // Get day of week in Indonesian
                    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                    const dateParts = record.tanggal.split('-');
                    // Create date from YYYY-MM-DD format
                    const date = new Date(
                        parseInt(dateParts[0]), // Year
                        parseInt(dateParts[1]) - 1, // Month (0-indexed)
                        parseInt(dateParts[2]) // Day
                    );
                    const dayOfWeek = days[date.getDay()];

                    groupedByDate[record.tanggal] = {
                        tanggal: record.tanggal,
                        hari: dayOfWeek,
                        absensi: []
                    };
                }

                // Format each attendance record
                const absensiData = {
                    absensiGuruId: record.id,
                    namaGuru: record.guru.nama,
                    NIP: record.guru.nip,
                    waktuMasuk: record.jamMasuk,
                    waktuKeluar: record.jamKeluar,
                    sks: record.sks,
                    statusKehadiran: record.statusKehadiran,
                    keterangan: this.getKehadiranDescription(record.statusKehadiran),
                    suratIzin: record.suratIzin || null
                };

                groupedByDate[record.tanggal].absensi.push(absensiData);
            });

            // Convert to array and sort by date (newest first)
            return Object.values(groupedByDate).sort((a, b) => {
                return new Date(b.tanggal) - new Date(a.tanggal);
            });
        } catch (error) {
            logger.error('Error getting grouped guru attendance:', error);
            throw error;
        }
    }

    // Helper to get description for attendance status
    getKehadiranDescription(status) {
        switch (status) {
            case 'HADIR':
                return 'Hadir mengajar';
            case 'IZIN':
                return 'Izin tidak mengajar';
            case 'SAKIT':
                return 'Sakit';
            case 'TIDAK_HADIR':
                return 'Tidak hadir tanpa keterangan';
            default:
                return '';
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
                jamMasuk: data.jamMasuk,
                jamKeluar: data.jamKeluar,
                ...(data.keterangan && { keterangan: data.keterangan }),
                ...(data.suratIzin && { suratIzin: data.suratIzin })
            };

            const updated = await prisma.absensiGuru.update({
                where: { id },
                data: absensiData,
                include: {
                    guru: {
                        select: {
                            id: true,
                            nama: true,
                            nip: true
                        }
                    },
                    kelasProgram: {
                        include: {
                            kelas: true,
                            program: true,
                            jamMengajar: true
                        }
                    }
                }
            });

            // Format the response
            const formattedResponse = {
                id: updated.id,
                tanggal: updated.tanggal,
                namaGuru: updated.guru.nama,
                nipGuru: updated.guru.nip,
                kelasProgram: {
                    id: updated.kelasProgram.id,
                    kelas: updated.kelasProgram.kelas?.namaKelas || 'Tidak Ada Kelas',
                    program: updated.kelasProgram.program.namaProgram,
                    jamMulai: updated.kelasProgram.jamMengajar.jamMulai,
                    jamSelesai: updated.kelasProgram.jamMengajar.jamSelesai
                },
                jamMasuk: updated.jamMasuk,
                jamKeluar: updated.jamKeluar,
                sks: updated.sks,
                statusKehadiran: updated.statusKehadiran,
                keterangan: data.keterangan || this.getKehadiranDescription(updated.statusKehadiran),
                suratIzin: updated.suratIzin
            };

            logger.info(`Updated guru attendance with ID: ${id}`);
            return formattedResponse;
        } catch (error) {
            logger.error(`Error updating guru attendance with ID ${id}:`, error);
            throw error;
        }
    }
}

module.exports = new AbsensiService();
