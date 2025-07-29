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

    
    /**
     * Get absensi guru by date - menampilkan semua guru yang memiliki jadwal ATAU sudah ada data absensi
     * 
     * Logic yang diperbaiki:
     * 1. Ambil guru yang memiliki jadwal kelas program pada hari tersebut
     * 2. ATAU guru yang sudah ada data absensi pada tanggal tersebut (misalnya absen via RFID)
     * 3. Tampilkan jadwal kelas program untuk setiap guru
     * 4. Jika ada data absensi untuk tanggal tersebut, tampilkan juga
     * 5. Jika belum ada absensi, status = 'BELUM_ABSEN'
     * 6. Handle kasus guru yang absen di hari lain (tidak punya jadwal hari ini)
     * 
     * @param {Object} filters - Filter parameters (tanggal, page, limit)
     * @param {string} baseUrl - Base URL for file access
     * @returns {Object} Data absensi guru dengan jadwal kelas program
     */
    async getAbsensiGuruByDate(filters = {}, baseUrl) {
        try {
            const { tanggal, page = 1, limit = 10 } = filters;

            // Parse tanggal untuk mendapatkan hari
            const dateObj = moment(tanggal, DATE_FORMATS.DEFAULT);
            if (!dateObj.isValid()) {
                throw new BadRequestError('Format tanggal tidak valid');
            }

            // Get current day name in Indonesian format
            const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
            const hari = dayNames[dateObj.day()];

            // Get all guru yang memiliki jadwal kelas program pada hari tersebut ATAU sudah ada data absensi
            const result = await PrismaUtils.paginate(prisma.guru, {
                page,
                limit,
                where: {
                    OR: [
                        // Guru yang memiliki jadwal kelas program pada hari tersebut
                        {
                            kelasProgram: {
                                some: {
                                    hari: hari
                                }
                            }
                        },
                        // Guru yang sudah ada data absensi pada tanggal tersebut
                        {
                            AbsensiGuru: {
                                some: {
                                    tanggal: tanggal
                                }
                            }
                        }
                    ]
                },
                include: {
                    // Include jadwal kelas program untuk hari tersebut
                    kelasProgram: {
                        where: {
                            hari: hari
                        },
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
                            },
                            // Include absensi guru jika ada untuk tanggal tersebut
                            absensiGuru: {
                                where: {
                                    tanggal: tanggal
                                }
                            }
                        },
                        orderBy: {
                            jamMengajar: {
                                jamMulai: 'asc'
                            }
                        }
                    },
                    // Include semua absensi guru untuk tanggal tersebut (untuk guru yang tidak punya jadwal hari ini)
                    AbsensiGuru: {
                        where: {
                            tanggal: tanggal
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
                        orderBy: {
                            jamMasuk: 'asc'
                        }
                    }
                },
                orderBy: [
                    { nama: 'asc' }
                ]
            });

            const transformedData = result.data.map(guru => {
                let sksHariIni = 0;
                const absensiData = [];

                // Process jadwal kelas program untuk hari tersebut
                guru.kelasProgram.forEach(kelasProgram => {
                    // Check if there's absensi data for this kelas program
                    const absensiRecord = kelasProgram.absensiGuru[0]; // Should be max 1 record per kelas program per date

                    // Calculate SKS for hari ini (only if hadir)
                    if (absensiRecord && absensiRecord.statusKehadiran === 'HADIR') {
                        sksHariIni += absensiRecord.sks || 0;
                    }

                    // Format surat izin URL jika ada
                    let suratIzinUrl = null;
                    if (absensiRecord && absensiRecord.suratIzin) {
                        suratIzinUrl = `${baseUrl}/uploads/documents/surat_izin/${absensiRecord.suratIzin}`;
                    }

                    // Create absensi data entry
                    const absensiEntry = {
                        absensiGuruId: absensiRecord ? absensiRecord.id : null,
                        kelasProgramId: kelasProgram.id,
                        namaKelas: kelasProgram.kelas?.namaKelas || 'Belum ditentukan',
                        namaProgram: kelasProgram.program.namaProgram,
                        jamMengajar: {
                            jamMengajarId: kelasProgram.jamMengajar.id,
                            jamMulai: kelasProgram.jamMengajar.jamMulai,
                            jamSelesai: kelasProgram.jamMengajar.jamSelesai
                        },
                        statusKehadiran: absensiRecord ? absensiRecord.statusKehadiran : 'BELUM_ABSEN',
                        waktuMasuk: absensiRecord ? absensiRecord.jamMasuk : null,
                        keterangan: absensiRecord ? absensiRecord.keterangan : null,
                        suratIzin: suratIzinUrl
                    };

                    absensiData.push(absensiEntry);
                });

                // Process absensi yang tidak terkait dengan jadwal hari ini (misalnya absen di hari lain)
                guru.AbsensiGuru.forEach(absensiRecord => {
                    // Skip jika sudah diproses di atas (sudah ada di jadwal hari ini)
                    const sudahDiproses = absensiData.some(data => data.absensiGuruId === absensiRecord.id);
                    if (sudahDiproses) return;

                    // Calculate SKS for hari ini (only if hadir)
                    if (absensiRecord.statusKehadiran === 'HADIR') {
                        sksHariIni += absensiRecord.sks || 0;
                    }

                    // Format surat izin URL jika ada
                    let suratIzinUrl = null;
                    if (absensiRecord.suratIzin) {
                        suratIzinUrl = `${baseUrl}/uploads/documents/surat_izin/${absensiRecord.suratIzin}`;
                    }

                    // Create absensi data entry untuk absensi yang tidak terkait jadwal hari ini
                    const absensiEntry = {
                        absensiGuruId: absensiRecord.id,
                        kelasProgramId: absensiRecord.kelasProgramId,
                        namaKelas: absensiRecord.kelasProgram.kelas?.namaKelas || 'Belum ditentukan',
                        namaProgram: absensiRecord.kelasProgram.program.namaProgram,
                        jamMengajar: {
                            jamMengajarId: absensiRecord.kelasProgram.jamMengajar.id,
                            jamMulai: absensiRecord.kelasProgram.jamMengajar.jamMulai,
                            jamSelesai: absensiRecord.kelasProgram.jamMengajar.jamSelesai
                        },
                        statusKehadiran: absensiRecord.statusKehadiran,
                        waktuMasuk: absensiRecord.jamMasuk,
                        keterangan: absensiRecord.keterangan,
                        suratIzin: suratIzinUrl
                    };

                    absensiData.push(absensiEntry);
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

            // Cek apakah siswa ada di kelas pengganti untuk kelas program ini
            const kelasPengganti = await prisma.kelasPengganti.findFirst({
                where: {
                    kelasProgramId,
                    siswaId,
                    tanggal,
                    isTemp: true,
                    deletedAt: null
                }
            });

            // Jika siswa adalah temporary, guru kelas pengganti berwenang mengubah absensi
            if (kelasPengganti) {
                // Validasi bahwa guru berwenang untuk kelas pengganti ini
                const kelasProgram = await prisma.kelasProgram.findUnique({
                    where: { id: kelasProgramId }
                });

                if (!kelasProgram) {
                    throw new NotFoundError('Kelas program tidak ditemukan');
                }

                if (kelasProgram.guruId !== guruId) {
                    throw new ForbiddenError('Guru tidak berwenang mengubah absensi siswa kelas pengganti');
                }

                // Update absensi langsung di kelas pengganti
                const absensi = await prisma.absensiSiswa.findFirst({
                    where: {
                        siswaId,
                        kelasProgramId,
                        tanggal
                    }
                });

                if (!absensi) {
                    throw new NotFoundError('Absensi siswa tidak ditemukan untuk kelas pengganti ini');
                }

                const updated = await prisma.absensiSiswa.update({
                    where: { id: absensi.id },
                    data: { statusKehadiran },
                    include: {
                        siswa: {
                            select: {
                                id: true,
                                namaMurid: true,
                                nis: true
                            }
                        }
                    }
                });

                logger.info(`Updated attendance for temporary student ${updated.siswa.namaMurid} to ${statusKehadiran} for today (${tanggal}) in substitute class ${kelasProgramId}`);

                return {
                    id: updated.id,
                    tanggal: updated.tanggal,
                    namaSiswa: updated.siswa.namaMurid,
                    nisSiswa: updated.siswa.nis,
                    statusKehadiran: updated.statusKehadiran,
                    isTemporary: true
                };
            }

            // Logic untuk siswa regular
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
            // Validasi tanggal tidak boleh masa lalu
            const dateObj = moment(tanggal, DATE_FORMATS.DEFAULT);
            if (!dateObj.isValid()) {
                throw new BadRequestError('Format tanggal tidak valid');
            }

            const today = moment().startOf('day');
            const inputDate = dateObj.startOf('day');
            
            if (inputDate.isBefore(today)) {
                throw new BadRequestError('Tanggal tidak boleh masa lalu. Hanya bisa update absensi untuk hari ini atau masa depan');
            }

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

    async getAbsensiSiswaByKelasProgram(kelasProgramId, guruId, tanggal = null) {
        try {
            // Use provided date or default to today's date
            const targetDate = tanggal || todayDate;

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
                            tanggal: targetDate
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
                            tanggal: targetDate,
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

            logger.info(`Retrieved attendance (${targetDate}) for kelas program: ${kelasProgramId} by guru: ${guruId}`);
            return result;
        } catch (error) {
            logger.error('Error getting absensi siswa by kelas program:', error);
            throw error;
        }
    }


    async createAbsensiSiswa(kelasProgramId, tanggal) {
        try {
            // Validasi format tanggal dan konversi ke hari
            const dateObj = moment(tanggal, DATE_FORMATS.DEFAULT);
            if (!dateObj.isValid()) {
                throw new BadRequestError('Format tanggal tidak valid');
            }

            // Validasi tanggal tidak boleh masa lalu
            const today = moment().startOf('day');
            const inputDate = dateObj.startOf('day');
            
            if (inputDate.isBefore(today)) {
                throw new BadRequestError('Tanggal tidak boleh masa lalu. Hanya bisa create absensi untuk hari ini atau masa depan');
            }

            // Get day from date (0 = Sunday, 1 = Monday, etc.)
            const dayNumber = dateObj.day();
            const dayMapping = {
                1: 'SENIN',
                2: 'SELASA',
                3: 'RABU',
                4: 'KAMIS',
                5: 'JUMAT',
                6: 'SABTU'
            };

            const dayFromDate = dayMapping[dayNumber];
            if (!dayFromDate) {
                throw new BadRequestError('Tidak ada jadwal kelas pada hari Minggu');
            }

            // Cari kelas program dan validasi jadwal
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
                            tanggal: tanggal,
                            isTemp: true,
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
                throw new NotFoundError('Kelas program tidak ditemukan');
            }

            // Validasi jadwal: kelas program harus ada jadwal di hari tersebut
            if (kelasProgram.hari !== dayFromDate) {
                throw new BadRequestError(`Kelas program ini tidak ada jadwal pada hari ${dayFromDate}. Jadwal kelas ini pada hari ${kelasProgram.hari}`);
            }

            // Cek apakah sudah ada absensi untuk tanggal tersebut
            const existingAbsensi = await prisma.absensiSiswa.findFirst({
                where: {
                    kelasProgramId: kelasProgramId,
                    tanggal: tanggal
                }
            });

            if (existingAbsensi) {
                throw new BadRequestError(`Absensi untuk kelas program ini pada tanggal ${tanggal} sudah ada`);
            }

            // Get all students (regular + substitute)
            const regularSiswa = kelasProgram.programSiswa || [];
            const substituteSiswa = kelasProgram.kelasPengganti || [];

            const allSiswa = [
                ...regularSiswa.map(ps => ({
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
                throw new BadRequestError('Tidak ada siswa aktif dalam kelas program ini');
            }

            // Create absensi records
            const absensiRecords = [];
            for (const siswa of allSiswa) {
                const absensi = await prisma.absensiSiswa.create({
                    data: {
                        kelasProgramId: kelasProgramId,
                        siswaId: siswa.siswaId,
                        tanggal: tanggal,
                        statusKehadiran: 'TIDAK_HADIR'
                    }
                });

                absensiRecords.push({
                    absensiSiswaId: absensi.id,
                    siswaId: absensi.siswaId,
                    namaSiswa: siswa.namaSiswa,
                    nis: siswa.nis,
                    isKelasPengganti: siswa.isKelasPengganti,
                    tanggal: absensi.tanggal,
                    statusKehadiran: absensi.statusKehadiran
                });

                logger.info(`Created attendance record for student ${siswa.namaSiswa} (${siswa.isKelasPengganti ? 'substitute' : 'regular'}) in class ${kelasProgramId}`);
            }

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
                tanggal: tanggal,
                totalSiswa: absensiRecords.length,
                absensiSiswa: absensiRecords
            };

            logger.info(`Created ${absensiRecords.length} attendance records for kelas program ${kelasProgramId} on ${tanggal}`);
            return result;
        } catch (error) {
            logger.error('Error creating absensi siswa:', error);
            throw error;
        }
    }

    /**
     * Update absensi guru dengan RFID
     * 
     * Logic:
     * 1. Cari guru dengan RFID inputan
     * 2. Cek jadwal kelas program pada tanggal berdasarkan hari
     * 3. Bandingkan jam input dengan rentang jam mengajar
     * 4. Jika dalam rentang = HADIR, jika tidak = TIDAK_HADIR
     * 5. Create atau update data absensi
     * 
     * Validasi:
     * - Tanggal tidak boleh masa lalu atau masa depan (hanya hari ini)
     * - Guru harus memiliki jadwal mengajar pada tanggal tersebut
     * - Jika jam sebelum rentang mengajar = tidak bisa create entry
     * - Jika jam setelah rentang mengajar = TIDAK_HADIR
     * 
     * @param {string} rfid - RFID guru
     * @param {string} tanggal - Tanggal dalam format DD-MM-YYYY
     * @param {string} jam - Jam dalam format HH:MM
     * @returns {Object} Data absensi yang dibuat/diupdate
     */
    async updateAbsensiGuruWithRfid(rfid, tanggal, jam) {
        try {
            // Parse tanggal untuk mendapatkan hari
            const dateObj = moment(tanggal, DATE_FORMATS.DEFAULT);
            if (!dateObj.isValid()) {
                throw new BadRequestError('Format tanggal tidak valid');
            }

            // Validasi tanggal hanya hari ini (tidak boleh masa lalu atau masa depan)
            const today = moment().startOf('day');
            const inputDate = dateObj.startOf('day');
            
            if (!inputDate.isSame(today, 'day')) {
                throw new BadRequestError('Absensi hanya bisa dilakukan pada hari ini. Tanggal tidak boleh masa lalu atau masa depan');
            }

            // Get current day name in Indonesian format
            const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
            const hari = dayNames[dateObj.day()];

            // Validasi hari Minggu - tidak ada jadwal
            if (hari === 'MINGGU') {
                throw new BadRequestError('Tidak ada jadwal kelas pada hari Minggu');
            }

            // Cari guru dengan RFID
            const guru = await prisma.guru.findFirst({
                where: {
                    user: {
                        rfid: rfid
                    }
                },
                include: {
                    user: {
                        select: {
                            rfid: true
                        }
                    }
                }
            });

            if (!guru) {
                throw new NotFoundError('Guru dengan RFID tersebut tidak ditemukan');
            }

            // Cari jadwal kelas program guru pada hari tersebut
            const jadwalKelasProgram = await prisma.kelasProgram.findMany({
                where: {
                    guruId: guru.id,
                    hari: hari
                },
                include: {
                    jamMengajar: {
                        select: {
                            id: true,
                            jamMulai: true,
                            jamSelesai: true
                        }
                    },
                    kelas: {
                        select: {
                            namaKelas: true
                        }
                    },
                    program: {
                        select: {
                            namaProgram: true
                        }
                    }
                },
                orderBy: {
                    jamMengajar: {
                        jamMulai: 'asc'
                    }
                }
            });

            if (jadwalKelasProgram.length === 0) {
                throw new BadRequestError(`Guru tidak memiliki jadwal mengajar pada hari ${hari}. Absensi hanya bisa dilakukan jika ada jadwal mengajar`);
            }

            // Parse jam input
            const jamInput = moment(jam, 'HH:mm');
            if (!jamInput.isValid()) {
                throw new BadRequestError('Format jam tidak valid');
            }

            // Cek apakah jam input berada dalam rentang jadwal mengajar
            let jadwalYangCocok = null;
            let statusKehadiran = 'TIDAK_HADIR';
            let keterangan = '';

            for (const jadwal of jadwalKelasProgram) {
                const jamMulai = jadwal.jamMengajar.jamMulai;
                const jamSelesai = jadwal.jamMengajar.jamSelesai;

                // Parse jam untuk perbandingan
                const jamMulaiMoment = moment(jamMulai, 'HH:mm');
                const jamSelesaiMoment = moment(jamSelesai, 'HH:mm');

                // Cek apakah jam input berada dalam rentang
                if (jamInput.isBetween(jamMulaiMoment, jamSelesaiMoment, null, '[]')) {
                    jadwalYangCocok = jadwal;
                    statusKehadiran = 'HADIR';
                    keterangan = 'Absen dengan RFID tepat waktu';
                    break;
                } else if (jamInput.isAfter(jamSelesaiMoment)) {
                    // Jika jam setelah rentang, gunakan jadwal ini dan status TIDAK_HADIR
                    jadwalYangCocok = jadwal;
                    statusKehadiran = 'TIDAK_HADIR';
                    keterangan = 'Absen dengan RFID setelah jam mengajar';
                    break;
                } else if (jamInput.isBefore(jamMulaiMoment)) {
                    // Jika jam sebelum rentang, tidak bisa create entry
                    throw new BadRequestError(`Jam absen (${jam}) terlalu awal. Jadwal mengajar dimulai pada ${jamMulai}. Absensi hanya bisa dilakukan saat atau setelah jam mengajar dimulai`);
                }
            }

            // Jika tidak ada jadwal yang cocok (jam terlalu awal untuk semua jadwal)
            if (!jadwalYangCocok) {
                const jadwalPertama = jadwalKelasProgram[0];
                const jamMulaiPertama = jadwalPertama.jamMengajar.jamMulai;
                throw new BadRequestError(`Jam absen (${jam}) terlalu awal. Jadwal mengajar pertama dimulai pada ${jamMulaiPertama}. Absensi hanya bisa dilakukan saat atau setelah jam mengajar dimulai`);
            }

            // Cek apakah sudah ada data absensi untuk tanggal dan kelas program ini
            const existingAbsensi = await prisma.absensiGuru.findFirst({
                where: {
                    guruId: guru.id,
                    kelasProgramId: jadwalYangCocok.id,
                    tanggal: tanggal
                }
            });

            let result;
            if (existingAbsensi) {
                // Update data absensi yang sudah ada
                result = await prisma.absensiGuru.update({
                    where: {
                        id: existingAbsensi.id
                    },
                    data: {
                        jamMasuk: jam,
                        statusKehadiran: statusKehadiran,
                        sks: statusKehadiran === 'HADIR' ? 2 : 0, // Default SKS
                        keterangan: keterangan,
                        updatedAt: new Date()
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
                                        jamMulai: true,
                                        jamSelesai: true
                                    }
                                }
                            }
                        }
                    }
                });

                logger.info(`Updated absensi guru ${guru.nama} (RFID: ${rfid}) untuk tanggal ${tanggal} jam ${jam} - Status: ${statusKehadiran}`);
            } else {
                // Buat data absensi baru
                result = await prisma.absensiGuru.create({
                    data: {
                        guruId: guru.id,
                        kelasProgramId: jadwalYangCocok.id,
                        tanggal: tanggal,
                        jamMasuk: jam,
                        statusKehadiran: statusKehadiran,
                        sks: statusKehadiran === 'HADIR' ? 2 : 0, // Default SKS
                        keterangan: keterangan
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
                                        jamMulai: true,
                                        jamSelesai: true
                                    }
                                }
                            }
                        }
                    }
                });

                logger.info(`Created absensi guru ${guru.nama} (RFID: ${rfid}) untuk tanggal ${tanggal} jam ${jam} - Status: ${statusKehadiran}`);
            }

            return {
                absensiId: result.id,
                guruId: guru.id,
                namaGuru: guru.nama,
                rfid: rfid,
                tanggal: tanggal,
                jamAbsen: jam,
                statusKehadiran: result.statusKehadiran,
                sks: result.sks,
                keterangan: result.keterangan,
                jadwal: {
                    kelasProgramId: jadwalYangCocok.id,
                    namaKelas: jadwalYangCocok.kelas?.namaKelas || 'Tidak Ada Kelas',
                    namaProgram: jadwalYangCocok.program.namaProgram,
                    jamMengajar: {
                        jamMulai: jadwalYangCocok.jamMengajar.jamMulai,
                        jamSelesai: jadwalYangCocok.jamMengajar.jamSelesai
                    }
                },
                isUpdate: !!existingAbsensi
            };

        } catch (error) {
            logger.error('Error updating absensi guru with RFID:', error);
            throw error;
        }
    }
}

module.exports = new AbsensiService();
