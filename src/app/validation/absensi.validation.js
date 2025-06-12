const Joi = require('joi');

class AbsensiValidation {

    tanggal() {
        return Joi.object({
            kelasId: Joi.string().required()
                .messages({
                    'any.required': 'ID Kelas wajib diisi'
                }),
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
            jamMasuk: Joi.string()
                .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
                .optional()
                .allow(null)
                .messages({
                    'string.pattern.base': 'Format jam masuk harus HH:MM (24 jam)'
                }),
            jamKeluar: Joi.string()
                .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
                .optional()
                .allow(null)
                .messages({
                    'string.pattern.base': 'Format jam keluar harus HH:MM (24 jam)'
                }),
            keterangan: Joi.string().optional()
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

}

module.exports = new AbsensiValidation(); 