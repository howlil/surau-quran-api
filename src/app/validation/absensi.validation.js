const Joi = require('joi');

class AbsensiValidation {

    tanggal() {
        return Joi.object({
            tanggal: Joi.string()
                .regex(/^\d{2}-\d{2}-\d{4}$/)
                .optional()
                .messages({
                    'string.pattern.base': 'Format tanggal harus DD-MM-YYYY'
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
        });
    }

    updateAbsensiGuru() {
        return Joi.object({
            statusKehadiran: Joi.string().valid('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT').required()
                .messages({
                    'any.required': 'Status kehadiran wajib diisi',
                    'any.only': 'Status kehadiran tidak valid'
                }),
            jamMasuk: Joi.when('statusKehadiran', {
                is: Joi.valid('HADIR'),
                then: Joi.string()
                    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
                    .allow(null, '')
                    .optional()
                    .messages({
                        'string.pattern.base': 'Format jam masuk harus HH:MM (24 jam)'
                    }),
                otherwise: Joi.forbidden()
                    .messages({
                        'any.unknown': 'Jam masuk hanya diperlukan untuk status HADIR'
                    })
            }),
            jamKeluar: Joi.when('statusKehadiran', {
                is: Joi.valid('HADIR'),
                then: Joi.string()
                    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
                    .allow(null, '')
                    .optional()
                    .messages({
                        'string.pattern.base': 'Format jam keluar harus HH:MM (24 jam)'
                    }),
                otherwise: Joi.forbidden()
                    .messages({
                        'any.unknown': 'Jam keluar hanya diperlukan untuk status HADIR'
                    })
            }),
            keterangan: Joi.string().allow(null, '').optional()
                .messages({
                    'string.base': 'Keterangan harus berupa teks'
                }),
            suratIzin: Joi.when('statusKehadiran', {
                is: Joi.valid('IZIN', 'SAKIT'),
                then: Joi.string().required(),
                otherwise: Joi.forbidden()
                    .messages({
                        'any.unknown': 'Surat izin tidak diperlukan untuk status HADIR atau TIDAK_HADIR'
                    })
            })
                .messages({
                    'any.required': 'Surat izin wajib diisi untuk status IZIN atau SAKIT'
                }),
        });
    }

    updateAbsensiSiswa() {
        return Joi.object({
            statusKehadiran: Joi.string().valid('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT').required()
                .messages({
                    'any.required': 'Status kehadiran wajib diisi',
                    'any.only': 'Status kehadiran tidak valid'
                }),
        });
    }

    createAbsensiSiswa() {
        return Joi.object({
            kelasProgramId: Joi.string().guid({ version: 'uuidv4' }).required()
                .messages({
                    'string.guid': 'ID kelas program harus berupa UUID yang valid',
                    'any.required': 'ID kelas program wajib diisi'
                }),
            tanggal: Joi.string()
                .regex(/^\d{2}-\d{2}-\d{4}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Format tanggal harus DD-MM-YYYY',
                    'any.required': 'Tanggal wajib diisi'
                }),
            absensi: Joi.array().items(
                Joi.object({
                    siswaId: Joi.string().guid({ version: 'uuidv4' }).required()
                        .messages({
                            'string.guid': 'ID siswa harus berupa UUID yang valid',
                            'any.required': 'ID siswa wajib diisi'
                        }),
                    statusKehadiran: Joi.string().valid('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT').required()
                        .messages({
                            'any.required': 'Status kehadiran wajib diisi',
                            'any.only': 'Status kehadiran tidak valid'
                        })
                })
            ).min(1).required()
                .messages({
                    'array.min': 'Minimal harus ada satu data absensi',
                    'any.required': 'Data absensi wajib diisi'
                })
        });
    }

    getSiswaByKelasProgram() {
        return Joi.object({
            kelasProgramId: Joi.string().guid({ version: 'uuidv4' }).required()
                .messages({
                    'string.guid': 'ID kelas program harus berupa UUID yang valid',
                    'any.required': 'ID kelas program wajib diisi'
                }),
            tanggal: Joi.string()
                .regex(/^\d{2}-\d{2}-\d{4}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Format tanggal harus DD-MM-YYYY',
                    'any.required': 'Tanggal wajib diisi'
                })
        });
    }

}

module.exports = new AbsensiValidation(); 