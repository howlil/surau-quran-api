const Joi = require('joi');
const ValidatorFactory = require('./factory.validation');

class PendaftaranValidation {
    static pendaftaranSiswa() {
        return ValidatorFactory.create({
            namaMurid: Joi.string().min(3).max(191).required()
                .messages({
                    'string.min': 'Nama murid minimal 3 karakter',
                    'string.max': 'Nama murid maksimal 191 karakter',
                    'any.required': 'Nama murid wajib diisi'
                }),
            namaPanggilan: Joi.string().min(2).max(50).optional()
                .messages({
                    'string.min': 'Nama panggilan minimal 2 karakter',
                    'string.max': 'Nama panggilan maksimal 50 karakter'
                }),
            tanggalLahir: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
                .messages({
                    'string.pattern.base': 'Format tanggal lahir harus YYYY-MM-DD'
                }),
            jenisKelamin: Joi.string().valid('LAKI_LAKI', 'PEREMPUAN').required()
                .messages({
                    'any.only': 'Jenis kelamin harus LAKI_LAKI atau PEREMPUAN',
                    'any.required': 'Jenis kelamin wajib diisi'
                }),
            alamat: Joi.string().min(5).max(500).optional()
                .messages({
                    'string.min': 'Alamat minimal 5 karakter',
                    'string.max': 'Alamat maksimal 500 karakter'
                }),
            strataPendidikan: Joi.string().valid('PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM').optional()
                .messages({
                    'any.only': 'Strata pendidikan harus salah satu dari: PAUD, TK, SD, SMP, SMA, KULIAH, UMUM'
                }),
            kelasSekolah: Joi.string().min(1).max(191).optional()
                .messages({
                    'string.min': 'Kelas sekolah minimal 1 karakter',
                    'string.max': 'Kelas sekolah maksimal 191 karakter'
                }),
            email: Joi.string().email().max(191).required()
                .messages({
                    'string.email': 'Format email tidak valid',
                    'string.max': 'Email maksimal 191 karakter',
                    'any.required': 'Email wajib diisi'
                }),
            namaSekolah: Joi.string().min(3).max(191).optional()
                .messages({
                    'string.min': 'Nama sekolah minimal 3 karakter',
                    'string.max': 'Nama sekolah maksimal 191 karakter'
                }),
            namaOrangTua: Joi.string().min(2).max(191).required()
                .messages({
                    'string.min': 'Nama orang tua minimal 2 karakter',
                    'string.max': 'Nama orang tua maksimal 191 karakter',
                    'any.required': 'Nama orang tua wajib diisi'
                }),
            namaPenjemput: Joi.string().min(2).max(191).optional()
                .messages({
                    'string.min': 'Nama penjemput minimal 2 karakter',
                    'string.max': 'Nama penjemput maksimal 191 karakter'
                }),
            noWhatsapp: Joi.string().min(10).max(15).optional()
                .messages({
                    'string.min': 'Nomor WhatsApp minimal 10 karakter',
                    'string.max': 'Nomor WhatsApp maksimal 15 karakter'
                }),
            programId: Joi.string().guid({ version: 'uuidv4' }).required()
                .messages({
                    'string.guid': 'Program ID harus berupa UUID yang valid',
                    'any.required': 'Program ID wajib diisi'
                }),
            jadwal: Joi.array().items(
                Joi.object({
                    hari: Joi.string().valid('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU').required()
                        .messages({
                            'any.only': 'Hari harus salah satu dari: SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU',
                            'any.required': 'Hari wajib diisi'
                        }),
                    jamMengajarId: Joi.string().guid({ version: 'uuidv4' }).required()
                        .messages({
                            'string.guid': 'Jam Mengajar ID harus berupa UUID yang valid',
                            'any.required': 'Jam Mengajar ID wajib diisi'
                        })
                })
            ).min(1).required()
                .messages({
                    'array.min': 'Jadwal harus memilih minimal 1 pilihan',
                    'any.required': 'Jadwal wajib diisi'
                }),
            kodeVoucher: Joi.string().uppercase().min(3).max(50).optional()
                .messages({
                    'string.min': 'Kode voucher minimal 3 karakter',
                    'string.max': 'Kode voucher maksimal 50 karakter'
                }),
            jumlahPembayaran: Joi.number().precision(2).positive().required()
                .messages({
                    'number.base': 'Jumlah pembayaran harus berupa angka',
                    'number.positive': 'Jumlah pembayaran harus lebih dari 0',
                    'any.required': 'Jumlah pembayaran wajib diisi'
                }),
            totalBiaya: Joi.number().precision(2).positive().required()
                .messages({
                    'number.base': 'Total biaya harus berupa angka',
                    'number.positive': 'Total biaya harus lebih dari 0',
                    'any.required': 'Total biaya wajib diisi'
                }),
            successRedirectUrl: Joi.string().uri().max(500).optional()
                .messages({
                    'string.uri': 'Success redirect URL harus berupa URL yang valid',
                    'string.max': 'Success redirect URL maksimal 500 karakter'
                }),
            failureRedirectUrl: Joi.string().uri().max(500).optional()
                .messages({
                    'string.uri': 'Failure redirect URL harus berupa URL yang valid',
                    'string.max': 'Failure redirect URL maksimal 500 karakter'
                })
        });
    }
}

module.exports = PendaftaranValidation; 