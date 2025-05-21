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
            tanggal: Joi.string().optional(),
        });
    }

    updateAbsensiGuru() {
        return Joi.object({
            statusKehadiran: Joi.string().valid('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT').required()
                .messages({
                    'any.required': 'Status kehadiran wajib diisi',
                    'any.only': 'Status kehadiran tidak valid'
                }),
            jamMasuk: Joi.string().required()
                .messages({
                    'any.required': 'Jam masuk wajib diisi'
                }),
            jamKeluar: Joi.string().required()
                .messages({
                    'any.required': 'Jam keluar wajib diisi'
                }),
            keterangan: Joi.string().optional()
                .messages({
                    'string.base': 'Keterangan harus berupa teks'
                }),
            suratIzin: Joi.string().optional()
                .messages({
                    'string.base': 'Surat izin harus berupa teks (URL)'
                }),
        });
    }

    markAbsensiSiswa() {
        return Joi.object({
            kelasProgramId: Joi.string().uuid().required(),
            tanggal: Joi.string().required(),
            siswaAttendance: Joi.array().items(
                Joi.object({
                    siswaId: Joi.string().uuid().required(),
                    statusKehadiran: Joi.string().valid('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT').required()
                })
            ).required().min(1)
        });
    }
}

module.exports = new AbsensiValidation(); 