const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class KelasProgramValidation {
    static getByKelasId() {
        return ValidatorFactory.create({
            kelasId: Joi.string().guid({ version: 'uuidv4' }).required()
                .messages({
                    'string.guid': 'Kelas ID harus berupa UUID yang valid',
                    'any.required': 'Kelas ID wajib diisi'
                }),
            page: Joi.number().integer().min(1).default(1)
                .messages({
                    'number.base': 'Halaman harus berupa angka',
                    'number.integer': 'Halaman harus berupa bilangan bulat',
                    'number.min': 'Halaman minimal 1'
                }),
            limit: Joi.number().integer().min(1).max(100).default(10)
                .messages({
                    'number.base': 'Batas harus berupa angka',
                    'number.integer': 'Batas harus berupa bilangan bulat',
                    'number.min': 'Batas minimal 1',
                    'number.max': 'Batas maksimal 100'
                }),
            hari: Joi.string().valid('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU').optional()
                .messages({
                    'any.only': 'Hari harus salah satu dari: SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU'
                }),
            programId: Joi.string().guid({ version: 'uuidv4' }).optional()
                .messages({
                    'string.guid': 'Program ID harus berupa UUID yang valid'
                })
        });
    }

    static getDetailById() {
        return ValidatorFactory.create({
            id: Joi.string().guid({ version: 'uuidv4' }).required()
                .messages({
                    'string.guid': 'Kelas Program ID harus berupa UUID yang valid',
                    'any.required': 'Kelas Program ID wajib diisi'
                })
        });
    }

    static updateKelasProgramDetail() {
        return ValidatorFactory.create({
            kelasId: Joi.string().guid({ version: 'uuidv4' }).optional()
                .messages({
                    'string.guid': 'Kelas ID harus berupa UUID yang valid'
                }),
            programId: Joi.string().guid({ version: 'uuidv4' }).optional()
                .messages({
                    'string.guid': 'Program ID harus berupa UUID yang valid'
                }),
            jamMengajarId: Joi.string().guid({ version: 'uuidv4' }).optional()
                .messages({
                    'string.guid': 'Jam Mengajar ID harus berupa UUID yang valid'
                }),
            hari: Joi.string().valid('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU').optional()
                .messages({
                    'any.only': 'Hari harus salah satu dari: SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU'
                }),
            guruId: Joi.string().guid({ version: 'uuidv4' }).optional()
                .messages({
                    'string.guid': 'Guru ID harus berupa UUID yang valid'
                }),
            tipeKelas: Joi.string().optional()
                .messages({
                    'string.empty': 'Tipe kelas tidak boleh kosong'
                }),
            siswaListUpdates: Joi.array().items(
                Joi.object({
                    action: Joi.string().valid('ADD', 'REMOVE').required()
                        .messages({
                            'any.only': 'Action harus ADD atau REMOVE',
                            'any.required': 'Action wajib diisi'
                        }),
                    jadwalSiswaId: Joi.string().guid({ version: 'uuidv4' }).optional()
                        .messages({
                            'string.guid': 'Jadwal Siswa ID harus berupa UUID yang valid'
                        }),
                    programSiswaId: Joi.string().guid({ version: 'uuidv4' }).optional()
                        .messages({
                            'string.guid': 'Program Siswa ID harus berupa UUID yang valid'
                        })
                })
            ).optional()
        });
    }
}

module.exports = KelasProgramValidation; 