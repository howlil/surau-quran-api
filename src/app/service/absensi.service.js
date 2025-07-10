const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../../lib/http/errors.http');
const FileUtils = require('../../lib/utils/file.utils');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const moment = require('moment');
const { DATE_FORMATS } = require('../../lib/constants');
const todayDate = moment().format(DATE_FORMATS.DEFAULT);
class AbsensiService {

    async getAbsensiSiswaForAdmin(filters = {}) {
        try {
            const { kelasId, tanggal } = filters;

            if (!kelasId) {
                throw new BadRequestError('ID Kelas wajib diisi');
            }

            const where = {
                kelasId
            };

            if (tanggal) {
                where.absensiSiswa = {
                    some: {
                        tanggal
                    }
                };
            }

            const kelasPrograms = await prisma.kelasProgram.findMany({
                where,
                include: {
                    kelas: true,
                    program: true,
                    jamMengajar: true,
                    absensiSiswa: {
                        where: tanggal ? { tanggal } : undefined,
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

            if (kelasPrograms.length === 0) {
                return {
                    kelasId,
                    namaKelas: 'Kelas tidak ditemukan',
                    program: []
                };
            }

            // Group by kelasId
            const kelasMap = new Map();

            kelasPrograms.forEach(kelasProgram => {
                const kelasId = kelasProgram.kelasId;
                const namaKelas = kelasProgram.kelas?.namaKelas || 'Tidak Ada Kelas';

                if (!kelasMap.has(kelasId)) {
                    kelasMap.set(kelasId, {
                        kelasId,
                        namaKelas,
                        tanggal: tanggal || null,
                        program: []
                    });
                }

                // Get the class entry
                const kelasEntry = kelasMap.get(kelasId);

                // Format attendance data for this program
                const absensiData = kelasProgram.absensiSiswa.map(record => ({
                    siswaId: record.siswaId,
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

            const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            // Convert the map to an array
            const result = Array.from(kelasMap.values())[0]; // Return single object since we're filtering by kelasId
            const transformedResult = {
                ...result,
                program: result.program.map(program => ({
                    ...program,
                    absensi: program.absensi.map(record => ({
                        ...record,
                        suratIzin: FileUtils.getSuratIzinUrl(baseUrl, record.suratIzin)
                    }))
                }))
            };
            return transformedResult;
        } catch (error) {
            logger.error('Error getting siswa attendance by kelas:', error);
            throw error;
        }
    }

    async getAbsensiGuruByDate(filters = {}, baseUrl) {
        try {
            const { tanggal, page = 1, limit = 10 } = filters;

            // Use PrismaUtils.paginate for guru with absensi data
            const result = await PrismaUtils.paginate(prisma.guru, {
                page,
                limit,
                where: {
                    AbsensiGuru: {
                        some: {
                            tanggal
                        }
                    }
                },
                include: {
                    AbsensiGuru: {
                        where: {
                            tanggal
                        },
                        include: {
                            kelasProgram: {
                                include: {
                                    kelas: {
                                        select: {
                                            namaKelas: true
                                        }
                                    },
                                    program: {
                                        select: {
                                            namaProgram: true
                                        }
                                    },
                                    jamMengajar: {
                                        select: {
                                            id: true,
                                            jamMulai: true,
                                            jamSelesai: true
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: [
                            { jamMasuk: 'asc' }
                        ]
                    }
                },
                orderBy: [
                    { nama: 'asc' }
                ]
            });

            // Transform data to match existing format
            const transformedData = result.data.map(guru => {
                // Hitung total SKS hari ini untuk guru
                let sksHariIni = 0;
                if (guru.AbsensiGuru) {
                    sksHariIni = guru.AbsensiGuru
                        .filter(record => record.statusKehadiran === 'HADIR')
                        .reduce((sum, record) => sum + record.sks, 0);
                }

                const absensiData = guru.AbsensiGuru.map(record => {
                    // Format surat izin URL jika ada
                    let suratIzinUrl = null;
                    if (record.suratIzin) {
                        suratIzinUrl = `${baseUrl}/uploads/documents/surat_izin/${record.suratIzin}`;
                    }

                    return {
                        absensiGuruId: record.id,
                        kelasProgramId: record.kelasProgramId,
                        namaKelas: record.kelasProgram.kelas?.namaKelas || 'Belum ditentukan',
                        namaProgram: record.kelasProgram.program.namaProgram,
                        jamMengajar: {
                            jamMengajarId: record.kelasProgram.jamMengajar.id,
                            jamMulai: record.kelasProgram.jamMengajar.jamMulai,
                            jamSelesai: record.kelasProgram.jamMengajar.jamSelesai
                        },
                        statusKehadiran: record.statusKehadiran,
                        waktuMasuk: record.jamMasuk,
                        keterangan: record.keterangan,
                        suratIzin: suratIzinUrl
                    };
                });

                return {
                    guruId: guru.id,
                    fotoProfile: guru.fotoProfile,
                    namaGuru: guru.nama,
                    nip: guru.nip,
                    sksHariIni,
                    absensi: absensiData
                };
            });

            return {
                tanggal,
                data: transformedData,
                pagination: result.pagination
            };
        } catch (error) {
            logger.error('Error getting absensi guru by date:', error);
            throw error;
        }
    }

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

    async updateAbsensiGuru(id, data) {
        try {
            const absensi = await prisma.absensiGuru.findUnique({
                where: { id }
            });

            if (!absensi) {
                throw new NotFoundError(`Absensi guru dengan ID ${id} tidak ditemukan`);
            }

            // Additional validation for IZIN/SAKIT status
            if (data.statusKehadiran === 'IZIN' || data.statusKehadiran === 'SAKIT') {
                if (!data.keterangan || data.keterangan.trim() === '') {
                    throw new BadRequestError('Keterangan wajib diisi untuk status IZIN atau SAKIT');
                }
                if (!data.suratIzin && !absensi.suratIzin) {
                    throw new BadRequestError('Surat izin wajib diupload untuk status IZIN atau SAKIT');
                }
            }

            // Prepare update data based on status kehadiran
            const updateData = {};

            if (data.statusKehadiran) {
                updateData.statusKehadiran = data.statusKehadiran;

                // Logic for IZIN or SAKIT
                if (data.statusKehadiran === 'IZIN' || data.statusKehadiran === 'SAKIT') {
                    updateData.jamMasuk = null; // waktuMasuk jadi null
                    updateData.keterangan = data.keterangan || null;

                    // Handle surat izin file upload
                    if (data.suratIzin) {
                        updateData.suratIzin = data.suratIzin;
                    }
                }
                // Logic for TIDAK_HADIR
                else if (data.statusKehadiran === 'TIDAK_HADIR') {
                    updateData.jamMasuk = null;
                    updateData.keterangan = null;
                    updateData.suratIzin = null;
                }
                // Logic for HADIR
                else if (data.statusKehadiran === 'HADIR') {
                    if (data.waktuMasuk) {
                        updateData.jamMasuk = data.waktuMasuk;
                    }
                    updateData.keterangan = data.keterangan || null;
                    updateData.suratIzin = null; // Clear surat izin for HADIR
                }
            } else {
                // Update individual fields if no statusKehadiran change
                if (data.waktuMasuk !== undefined) {
                    updateData.jamMasuk = data.waktuMasuk;
                }
                if (data.keterangan !== undefined) {
                    updateData.keterangan = data.keterangan;
                }
                if (data.suratIzin !== undefined) {
                    updateData.suratIzin = data.suratIzin;
                }
            }

            const updated = await prisma.absensiGuru.update({
                where: { id },
                data: updateData,
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
                            kelas: {
                                select: {
                                    namaKelas: true
                                }
                            },
                            program: {
                                select: {
                                    namaProgram: true
                                }
                            },
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

            // Format response sesuai requirement
            const result = {
                absensiGuruId: updated.id,
                kelasProgramId: updated.kelasProgramId,
                namaKelas: updated.kelasProgram.kelas?.namaKelas || 'Belum ditentukan',
                namaProgram: updated.kelasProgram.program.namaProgram,
                jamMengajar: {
                    jamMengajarId: updated.kelasProgram.jamMengajar.id,
                    jamMulai: updated.kelasProgram.jamMengajar.jamMulai,
                    jamSelesai: updated.kelasProgram.jamMengajar.jamSelesai
                },
                statusKehadiran: updated.statusKehadiran,
                waktuMasuk: updated.jamMasuk,
                keterangan: updated.keterangan,
                suratIzin: updated.suratIzin
            };

            logger.info(`Updated absensi guru with ID: ${id}`);
            return result;
        } catch (error) {
            logger.error(`Error updating absensi guru with ID ${id}:`, error);
            throw error;
        }
    }

    async updateAbsensiSiswa(kelasProgramId, siswaId, guruId, statusKehadiran) {
        try {
            const tanggal = todayDate;
            const kelasProgram = await prisma.kelasProgram.findUnique({
                where: {
                    id: kelasProgramId
                }
            });

            if (!kelasProgram) {
                throw new NotFoundError('Kelas program tidak ditemukan');
            }

            if (kelasProgram.guruId !== guruId) {
                throw new ForbiddenError('Guru tidak berwenang mengubah absensi siswa');
            }
            const kelasPengganti = await prisma.kelasPengganti.findFirst({
                where: {
                    kelasProgramId,
                    siswaId,
                    tanggal,
                    isTemp: true,
                    deletedAt: null
                }
            });

            // Jika siswa adalah temporary, gunakan logic khusus
            if (kelasPengganti) {
                return await this.updateAbsensiSiswaTemporary(kelasProgramId, siswaId, guruId, statusKehadiran, tanggal);
            }

            // Logic untuk siswa regular
            // Get existing absensi berdasarkan siswa, kelas program, dan tanggal
            const absensi = await prisma.absensiSiswa.findFirst({
                where: {
                    siswaId,
                    kelasProgramId,
                    tanggal,
                    kelasProgram: {
                        guruId
                    }
                },
                include: {
                    kelasProgram: true
                }
            });

            if (!absensi) {
                throw new NotFoundError(`Absensi siswa tidak ditemukan untuk hari ini di kelas program ${kelasProgramId} atau guru tidak berwenang mengubah absensi ini`);
            }

            // Update absensi
            const updated = await prisma.absensiSiswa.update({
                where: { id: absensi.id },
                data: {
                    statusKehadiran: statusKehadiran,
                },
                include: {
                    siswa: {
                        select: {
                            id: true,
                            namaMurid: true,
                            nis: true
                        }
                    },
                }
            });

            logger.info(`Updated attendance for regular student ${updated.siswa.namaMurid} to ${statusKehadiran} for today (${tanggal}) in kelas program ${kelasProgramId}`);

            return {
                id: updated.id,
                tanggal: updated.tanggal,
                namaSiswa: updated.siswa.namaMurid,
                nisSiswa: updated.siswa.nis,
                statusKehadiran: updated.statusKehadiran,
                isTemporary: false
            };
        } catch (error) {
            logger.error(`Error updating siswa attendance:`, error);
            throw error;
        }
    }


    static getSuratIzinUrl(baseUrl, filename) {
        if (!filename) return null;
        return `${baseUrl}/uploads/documents/surat_izin/${filename}`;
    }


    getDayFromDate(dateString) {
        const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
        const date = new Date(dateString.split('-').reverse().join('-'));
        return days[date.getDay()];
    }


    async findOriginalScheduleForTemporaryStudent(siswaId, tanggal, jamMulai, jamSelesai) {
        try {
            // Parse tanggal untuk mendapatkan hari
            const dateObj = new Date(tanggal.split('-').reverse().join('-'));
            const hariAbsensi = this.getDayFromDate(tanggal);

            // Cari program siswa aktif
            const programSiswa = await prisma.programSiswa.findFirst({
                where: {
                    siswaId,
                    status: 'AKTIF'
                },
                include: {
                    JadwalProgramSiswa: {
                        include: {
                            jamMengajar: true
                        },
                        where: {
                            hari: hariAbsensi
                        }
                    }
                }
            });

            if (!programSiswa || programSiswa.JadwalProgramSiswa.length === 0) {
                logger.warn(`No active program or schedule found for student ${siswaId} on ${hariAbsensi}`);
                return null;
            }

            const matchingSchedule = programSiswa.JadwalProgramSiswa.find(jadwal => {
                const jadwalJamMulai = jadwal.jamMengajar.jamMulai;
                const jadwalJamSelesai = jadwal.jamMengajar.jamSelesai;

                // Cek apakah jam temporary sama dengan jadwal asli
                return jadwalJamMulai === jamMulai && jadwalJamSelesai === jamSelesai;
            });

            if (matchingSchedule) {
                return {
                    programSiswaId: programSiswa.id,
                    jadwalId: matchingSchedule.id,
                    hari: matchingSchedule.hari,
                    jamMulai: matchingSchedule.jamMengajar.jamMulai,
                    jamSelesai: matchingSchedule.jamMengajar.jamSelesai,
                    urutan: matchingSchedule.urutan
                };
            }

            // Jika tidak ada yang cocok, ambil jadwal pertama untuk hari tersebut
            logger.warn(`No exact time match found for student ${siswaId}, using first schedule for ${hariAbsensi}`);
            const firstSchedule = programSiswa.JadwalProgramSiswa[0];

            return {
                programSiswaId: programSiswa.id,
                jadwalId: firstSchedule.id,
                hari: firstSchedule.hari,
                jamMulai: firstSchedule.jamMengajar.jamMulai,
                jamSelesai: firstSchedule.jamMengajar.jamSelesai,
                urutan: firstSchedule.urutan
            };

        } catch (error) {
            logger.error('Error finding original schedule for temporary student:', error);
            return null;
        }
    }

    async updateAbsensiSiswaTemporary(kelasProgramId, siswaId, guruId, statusKehadiran, tanggal) {
        try {
            // Validate guru access to kelas program
            const kelasProgram = await prisma.kelasProgram.findFirst({
                where: {
                    id: kelasProgramId,
                    guruId
                },
                include: {
                    jamMengajar: true
                }
            });

            if (!kelasProgram) {
                throw new NotFoundError('Kelas program tidak ditemukan atau guru tidak berwenang');
            }

            // Validate temporary student assignment
            const kelasPengganti = await prisma.kelasPengganti.findFirst({
                where: {
                    kelasProgramId,
                    siswaId,
                    tanggal,
                    isTemp: true,
                    deletedAt: null
                }
            });

            if (!kelasPengganti) {
                throw new NotFoundError('Siswa tidak ditemukan dalam kelas pengganti untuk hari ini');
            }

            // Cari jadwal asli siswa
            const originalSchedule = await this.findOriginalScheduleForTemporaryStudent(
                siswaId,
                tanggal,
                kelasProgram.jamMengajar.jamMulai,
                kelasProgram.jamMengajar.jamSelesai
            );

            if (!originalSchedule) {
                throw new BadRequestError('Tidak dapat menemukan jadwal asli siswa');
            }

            // Cari kelas program asli berdasarkan jadwal
            const originalKelasProgram = await prisma.kelasProgram.findFirst({
                where: {
                    programId: {
                        in: await prisma.programSiswa.findMany({
                            where: { id: originalSchedule.programSiswaId },
                            select: { programId: true }
                        }).then(ps => ps.map(p => p.programId))
                    },
                    hari: originalSchedule.hari,
                    jamMengajarId: originalSchedule.jamMengajarId
                }
            });

            if (!originalKelasProgram) {
                throw new BadRequestError('Tidak dapat menemukan kelas program asli');
            }

            // Cek apakah sudah ada absensi untuk jadwal asli di tanggal yang sama
            const existingAbsensi = await prisma.absensiSiswa.findFirst({
                where: {
                    kelasProgramId: originalKelasProgram.id,
                    siswaId,
                    tanggal
                }
            });

            if (existingAbsensi) {
                // Update absensi yang sudah ada
                const updatedAbsensi = await prisma.absensiSiswa.update({
                    where: { id: existingAbsensi.id },
                    data: {
                        statusKehadiran,
                        updatedAt: new Date()
                    }
                });

                logger.info(`Updated existing attendance for temporary student ${siswaId} on original schedule ${originalKelasProgram.id} for today (${tanggal})`);

                return {
                    message: 'Absensi berhasil diupdate',
                    siswaId,
                    tanggal,
                    statusKehadiran,
                    isTemporary: true,
                    originalKelasProgramId: originalKelasProgram.id,
                    temporaryKelasProgramId: kelasProgramId
                };
            } else {
                // Buat absensi baru untuk jadwal asli
                const newAbsensi = await prisma.absensiSiswa.create({
                    data: {
                        kelasProgramId: originalKelasProgram.id,
                        siswaId,
                        tanggal,
                        statusKehadiran
                    }
                });

                logger.info(`Created new attendance for temporary student ${siswaId} on original schedule ${originalKelasProgram.id} for today (${tanggal})`);

                return {
                    message: 'Absensi berhasil dibuat',
                    siswaId,
                    tanggal,
                    statusKehadiran,
                    isTemporary: true,
                    originalKelasProgramId: originalKelasProgram.id,
                    temporaryKelasProgramId: kelasProgramId
                };
            }

        } catch (error) {
            logger.error('Error updating attendance for temporary student:', error);
            throw error;
        }
    }

    async getAbsensiSiswaByKelasProgram(kelasProgramId, guruId) {
        try {
            // Get today's date in the same format used throughout the system


            const kelasProgram = await prisma.kelasProgram.findUnique({
                where: {
                    id: kelasProgramId
                },
                include: {
                    kelas: {
                        select: {
                            id: true,
                            namaKelas: true
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
                            id: true,
                            jamMulai: true,
                            jamSelesai: true
                        }
                    },
                    guru: {
                        select: {
                            id: true,
                            nama: true,
                            nip: true
                        }
                    },
                    absensiSiswa: {
                        where: {
                            tanggal: todayDate // Filter hanya absensi hari ini
                        },
                        include: {
                            siswa: {
                                select: {
                                    id: true,
                                    namaMurid: true,
                                    nis: true
                                }
                            }
                        },
                        orderBy: [
                            { siswa: { namaMurid: 'asc' } }
                        ]
                    },
                    kelasPengganti: {
                        where: {
                            tanggal: todayDate, // Filter hanya kelas pengganti hari ini
                            deletedAt: null
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


            if (!kelasProgram) {
                throw new NotFoundError(`Kelas program dengan ID ${kelasProgramId} tidak ditemukan`);
            }

            // Check if guru has access to this kelas program
            if (kelasProgram.guruId !== guruId) {
                throw new ForbiddenError('Anda tidak memiliki akses ke kelas program ini');
            }


            // Format absensi siswa dengan informasi apakah siswa temporary atau tidak
            const absensiSiswaFormatted = kelasProgram.absensiSiswa.map(absensi => {
                // Cek apakah siswa ini adalah siswa pengganti hari ini
                // Tanggal tidak perlu di-check karena sudah di-filter di query
                const isTemp = kelasProgram.kelasPengganti.some(kp =>
                    kp.siswaId === absensi.siswaId
                );

                return {
                    absensiSiswaId: absensi.id,
                    siswaId: absensi.siswaId,
                    namaSiswa: absensi.siswa.namaMurid,
                    nis: absensi.siswa.nis,
                    tanggal: absensi.tanggal,
                    statusKehadiran: absensi.statusKehadiran,
                    isTemp: isTemp
                };
            });

            const result = {
                kelasProgramId: kelasProgram.id,
                programId: kelasProgram.program.id,
                namaProgram: kelasProgram.program.namaProgram,
                kelasId: kelasProgram.kelas?.id || null,
                namaKelas: kelasProgram.kelas?.namaKelas || 'Tidak Ada Kelas',
                jamMengajarId: kelasProgram.jamMengajar.id,
                jamMulai: kelasProgram.jamMengajar.jamMulai,
                jamSelesai: kelasProgram.jamMengajar.jamSelesai,
                guruId: kelasProgram.guru.id,
                namaGuru: kelasProgram.guru.nama,
                nipGuru: kelasProgram.guru.nip,
                hari: kelasProgram.hari,
                tipeKelas: kelasProgram.tipeKelas,
                absensiSiswa: absensiSiswaFormatted
            };

            logger.info(`Retrieved today's attendance (${todayDate}) for kelas program: ${kelasProgramId} by guru: ${guruId}`);
            return result;
        } catch (error) {
            logger.error('Error getting absensi siswa by kelas program:', error);
            throw error;
        }
    }
}

module.exports = new AbsensiService();
