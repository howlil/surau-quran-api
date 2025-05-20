const Joi = require('joi');

class AbsensiValidation {
    getAbsensiSiswa() {
        return Joi.object({
            tanggal: Joi.string().optional(),
            bulan: Joi.string().optional(),
        });
    }

    getAbsensiGuru() {
        return Joi.object({
            tanggal: Joi.string().optional(),
        });
    }

    updateAbsensiGuru() {
        return Joi.object({
            statusKehadiran: Joi.string().valid('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT').required(),
            jamMasuk: Joi.string().optional(),
            jamKeluar: Joi.string().optional(),
            suratIzin: Joi.string().optional(),
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