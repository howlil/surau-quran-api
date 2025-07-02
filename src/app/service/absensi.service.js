const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, BadRequestError } = require('../../lib/http/errors.http');
const FileUtils = require('../../lib/utils/file.utils');

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
            const { tanggal } = filters;

            const absensiRecords = await prisma.absensiGuru.findMany({
                where: {
                    tanggal
                },
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
                },
                orderBy: [
                    { guru: { nama: 'asc' } },
                    { jamMasuk: 'asc' }
                ]
            });

            // Group absensi by guru
            const groupedByGuru = {};

            absensiRecords.forEach(record => {
                const guruId = record.guruId;

                if (!groupedByGuru[guruId]) {
                    groupedByGuru[guruId] = {
                        guruId: record.guru.id,
                        namaGuru: record.guru.nama,
                        nip: record.guru.nip,
                        sksHariIni: 0,
                        absensi: []
                    };
                }

                // Hitung total SKS hari ini untuk guru
                if (record.statusKehadiran === 'HADIR') {
                    groupedByGuru[guruId].sksHariIni += record.sks;
                }

                // Format surat izin URL jika ada
                let suratIzinUrl = null;
                if (record.suratIzin) {
                    suratIzinUrl = `${baseUrl}/uploads/documents/surat_izin/${record.suratIzin}`;
                }

                // Add absensi detail
                groupedByGuru[guruId].absensi.push({
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
                });
            });

            // Convert to array format
            const result = Object.values(groupedByGuru);

            return {
                tanggal,
                data: result
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

    async updateAbsensiSiswa(siswaId, guruId, data) {
        try {
            // Get existing absensi
            const absensi = await prisma.absensiSiswa.findFirst({
                where: {
                    siswaId,
                    kelasProgram: {
                        guruId
                    }
                },
                include: {
                    kelasProgram: true
                }
            });

            if (!absensi) {
                throw new NotFoundError('Absensi siswa tidak ditemukan atau guru tidak berwenang mengubah absensi ini');
            }

            logger.info(`Updating attendance for siswa ID: ${siswaId} ${data.value.statusKehadiran}`);
            // Format data
            const updated = await prisma.absensiSiswa.update({
                where: { id: absensi.id },
                data: {
                    statusKehadiran: data.value.statusKehadiran,
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

            const formattedResponse = {
                id: updated.id,
                tanggal: updated.tanggal,
                namaSiswa: updated.siswa.namaMurid,
                nisSiswa: updated.siswa.nis,
                statusKehadiran: updated.statusKehadiran,
            };

            return formattedResponse;
        } catch (error) {
            logger.error(`Error updating siswa attendance:`, error);
            throw error;
        }
    }

    async getAbsensiSiswaForGuru(guruId, filters = {}) {
        try {
            const { tanggal } = filters;

            if (!tanggal) {
                throw new BadRequestError('Tanggal wajib diisi');
            }

            const kelasPrograms = await prisma.kelasProgram.findMany({
                where: {
                    guruId,
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

                const kelasEntry = kelasMap.get(kelasId);

                const absensiData = kelasProgram.absensiSiswa.map(record => ({
                    siswaId: record.siswaId,
                    namaSiswa: record.siswa.namaMurid,
                    nis: record.siswa.nis,
                    status: record.statusKehadiran
                }));

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

            const result = Array.from(kelasMap.values());
            const transformedResult = result.map(item => ({
                ...item,
                program: item.program.map(program => ({
                    ...program,
                    absensi: program.absensi.map(record => ({
                        ...record,
                        suratIzin: FileUtils.getSuratIzinUrl(baseUrl, record.suratIzin)
                    }))
                }))
            }));
            return transformedResult;
        } catch (error) {
            logger.error('Error getting siswa attendance for guru:', error);
            throw error;
        }
    }

    static getSuratIzinUrl(baseUrl, filename) {
        if (!filename) return null;
        return `${baseUrl}/uploads/documents/surat_izin/${filename}`;
    }

    async createAbsensiSiswa(guruId, data) {
        try {
            const { kelasProgramId, tanggal, absensi } = data;

            // Verify that the teacher is assigned to this class
            const kelasProgram = await prisma.kelasProgram.findFirst({
                where: {
                    id: kelasProgramId,
                    guruId
                },
                include: {
                    programSiswa: {
                        where: {
                            status: 'AKTIF'
                        },
                        select: {
                            siswaId: true
                        }
                    }
                }
            });

            if (!kelasProgram) {
                throw new NotFoundError('Kelas program tidak ditemukan atau guru tidak berwenang');
            }

            // Get all active students in this class
            const activeSiswaIds = kelasProgram.programSiswa.map(ps => ps.siswaId);

            // Verify all students in the attendance list are active in this class
            const invalidSiswaIds = absensi
                .map(a => a.siswaId)
                .filter(id => !activeSiswaIds.includes(id));

            if (invalidSiswaIds.length > 0) {
                throw new BadRequestError(`Siswa dengan ID ${invalidSiswaIds.join(', ')} tidak terdaftar dalam kelas ini`);
            }

            // Check if attendance records already exist for this date and class
            const existingAbsensi = await prisma.absensiSiswa.findMany({
                where: {
                    kelasProgramId,
                    tanggal,
                    siswaId: {
                        in: absensi.map(a => a.siswaId)
                    }
                }
            });

            if (existingAbsensi.length > 0) {
                throw new BadRequestError('Absensi untuk tanggal ini sudah ada');
            }

            // Create attendance records
            const createdAbsensi = await prisma.$transaction(
                absensi.map(record =>
                    prisma.absensiSiswa.create({
                        data: {
                            kelasProgramId,
                            siswaId: record.siswaId,
                            tanggal,
                            statusKehadiran: record.statusKehadiran
                        },
                        include: {
                            siswa: {
                                select: {
                                    namaMurid: true,
                                    nis: true
                                }
                            }
                        }
                    })
                )
            );

            // Format response
            const formattedResponse = createdAbsensi.map(record => ({
                id: record.id,
                tanggal: record.tanggal,
                siswaId: record.siswaId,
                namaSiswa: record.siswa.namaMurid,
                nisSiswa: record.siswa.nis,
                statusKehadiran: record.statusKehadiran
            }));

            logger.info(`Created attendance records for class ${kelasProgramId} on ${tanggal}`);
            return formattedResponse;
        } catch (error) {
            logger.error('Error creating student attendance records:', error);
            throw error;
        }
    }

    async getSiswaByKelasProgram(guruId, data) {
        try {
            const { kelasProgramId, tanggal } = data;

            const kelasProgram = await prisma.kelasProgram.findFirst({
                where: {
                    id: kelasProgramId,
                    guruId
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
            });

            if (!kelasProgram) {
                throw new NotFoundError('Kelas program tidak ditemukan atau guru tidak berwenang');
            }

            // Get existing attendance records for this date
            const existingAbsensi = await prisma.absensiSiswa.findMany({
                where: {
                    kelasProgramId,
                    tanggal
                },
                select: {
                    siswaId: true,
                    statusKehadiran: true
                }
            });

            // Create a map of existing attendance records
            const absensiMap = new Map(
                existingAbsensi.map(record => [record.siswaId, record.statusKehadiran])
            );

            // Format response with student data and attendance status
            const formattedResponse = {
                kelasProgramId,
                namaProgram: kelasProgram.program.namaProgram,
                jamMengajar: {
                    jamMulai: kelasProgram.jamMengajar.jamMulai,
                    jamSelesai: kelasProgram.jamMengajar.jamSelesai
                },
                tanggal,
                siswa: kelasProgram.programSiswa.map(ps => ({
                    siswaId: ps.siswa.id,
                    namaSiswa: ps.siswa.namaMurid,
                    nisSiswa: ps.siswa.nis,
                    statusKehadiran: absensiMap.get(ps.siswa.id) || null
                }))
            };

            logger.info(`Retrieved students for class ${kelasProgramId} on ${tanggal}`);
            return formattedResponse;
        } catch (error) {
            logger.error('Error getting students by kelas program:', error);
            throw error;
        }
    }
}

module.exports = new AbsensiService();
