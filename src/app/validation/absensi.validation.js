const Joi = require('joi');

class AbsensiValidation {

    tanggal() {
        return Joi.object({
            tanggal: Joi.string()
                .regex(/^\d{2}-\d{2}-\d{4}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Format tanggal harus DD-MM-YYYY',
                    'any.required': 'Parameter tanggal wajib diisi'
                }),
        });
    }

    getAbsensiGuru() {
        return Joi.object({
            tanggal: Joi.string()
                .regex(/^\d{2}-\d{2}-\d{4}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Format tanggal harus DD-MM-YYYY',
                    'any.required': 'Parameter tanggal wajib diisi'
                }),
            page: Joi.number().integer().min(1).default(1)
                .messages({
                    'number.base': 'Page harus berupa angka',
                    'number.integer': 'Page harus berupa bilangan bulat',
                    'number.min': 'Page minimal 1'
                }),
            limit: Joi.number().integer().min(1).max(100).default(10)
                .messages({
                    'number.base': 'Limit harus berupa angka',
                    'number.integer': 'Limit harus berupa bilangan bulat',
                    'number.min': 'Limit minimal 1',
                    'number.max': 'Limit maksimal 100'
                })
        });
    }

    updateAbsensiGuru() {
        return Joi.object({
            statusKehadiran: Joi.string()
                .valid('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT')
                .optional()
                .messages({
                    'any.only': 'Status kehadiran harus salah satu dari: HADIR, TIDAK_HADIR, IZIN, SAKIT'
                }),
            waktuMasuk: Joi.string()
                .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
                .allow(null, '')
                .optional()
                .messages({
                    'string.pattern.base': 'Format waktu masuk harus HH:MM (24 jam)'
                }),
            keterangan: Joi.string()
                .allow(null, '')
                .optional()
                .messages({
                    'string.base': 'Keterangan harus berupa teks'
                }),
            suratIzin: Joi.any()
                .optional()
                .messages({
                    'any.base': 'Surat izin harus berupa file'
                })
        })
            .custom((value, helpers) => {
                const { statusKehadiran, keterangan, waktuMasuk } = value;

                // Jika status IZIN atau SAKIT, wajib ada keterangan
                if (statusKehadiran === 'IZIN' || statusKehadiran === 'SAKIT') {
                    if (!keterangan || keterangan.trim() === '') {
                        return helpers.error('custom.izinSakitKeterangan');
                    }
                    // waktuMasuk harus null untuk IZIN/SAKIT
                    if (waktuMasuk && waktuMasuk.trim() !== '') {
                        return helpers.error('custom.izinSakitWaktuMasuk');
                    }
                }

                // Jika status TIDAK_HADIR, semua field tambahan harus null
                if (statusKehadiran === 'TIDAK_HADIR') {
                    if ((waktuMasuk && waktuMasuk.trim() !== '') ||
                        (keterangan && keterangan.trim() !== '')) {
                        return helpers.error('custom.tidakHadirFields');
                    }
                }

                return value;
            }, 'Update Absensi Guru Validation')
            .messages({
                'custom.izinSakitKeterangan': 'Keterangan wajib diisi untuk status IZIN atau SAKIT',
                'custom.izinSakitWaktuMasuk': 'Waktu masuk harus kosong untuk status IZIN atau SAKIT',
                'custom.tidakHadirFields': 'Waktu masuk dan keterangan harus kosong untuk status TIDAK_HADIR'
            });
    }

    updateAbsensiSiswa() {
        return Joi.object({
            statusKehadiran: Joi.string().valid('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT').required()
                .messages({
                    'any.required': 'Status kehadiran wajib diisi',
                    'any.only': 'Status kehadiran tidak valid'
                }),
            siswaId: Joi.string().guid({ version: 'uuidv4' }).required()
                .messages({
                    'string.guid': 'Siswa ID harus berupa UUID yang valid',
                    'any.required': 'Siswa ID wajib diisi'
                })
        });
    }

    updateAbsensiSiswaParams() {
        return Joi.object({
            kelasProgramId: Joi.string().guid({ version: 'uuidv4' }).required()
                .messages({
                    'string.guid': 'Kelas Program ID harus berupa UUID yang valid',
                    'any.required': 'Kelas Program ID wajib diisi'
                })
        });
    }

    getAbsensiSiswaByKelasProgram() {
        return Joi.object({
            kelasProgramId: Joi.string().guid({ version: 'uuidv4' }).required()
                .messages({
                    'string.guid': 'Kelas Program ID harus berupa UUID yang valid',
                    'any.required': 'Kelas Program ID wajib diisi'
                })
        });
    }


}

module.exports = new AbsensiValidation(); 