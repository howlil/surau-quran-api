const { prisma } = require('../../lib/utils/prisma.utils');
const { logger } = require('../../lib/config/logger.config');
const VoucherService = require('./voucher.service');
const PaymentService = require('./payment.service');
const PasswordUtils = require('../../lib/utils/password.utils');

class PendaftaranService {
    static async createPendaftaran(pendaftaranData) {
        try {
            const {
                namaMurid,
                namaPanggilan,
                tanggalLahir,
                jenisKelamin,
                alamat,
                strataPendidikan,
                kelasSekolah,
                email,
                namaSekolah,
                namaOrangTua,
                namaPenjemput,
                noWhatsapp,
                programId,
                jadwal,
                kodeVoucher,
                jumlahPembayaran,
                totalBiaya,
                successRedirectUrl,
                failureRedirectUrl
            } = pendaftaranData;

            // Check if voucher exists and is valid if provided
            let voucherId = null;
            let voucherDiskon = 0;

            if (kodeVoucher) {
                const voucher = await VoucherService.getVoucherByKode(kodeVoucher);
                if (voucher) {
                    voucherId = voucher.id;
                    if (voucher.tipe === 'NOMINAL') {
                        voucherDiskon = Number(voucher.nominal);
                    } else if (voucher.tipe === 'PERSENTASE') {
                        voucherDiskon = Number(jumlahPembayaran) * (Number(voucher.nominal) / 100);
                    }
                }
            }

            // Create payment invoice with Xendit
            const paymentData = await PaymentService.createPendaftaranInvoice({
                email,
                namaMurid,
                totalBiaya,
                successRedirectUrl,
                failureRedirectUrl
            });

            // Store the pendaftaran data in temporary storage
            const pendaftaranTemp = await prisma.pendaftaranTemp.create({
                data: {
                    namaMurid,
                    namaPanggilan: namaPanggilan || null,
                    tanggalLahir: tanggalLahir || null,
                    jenisKelamin,
                    alamat: alamat || null,
                    strataPendidikan: strataPendidikan || null,
                    kelasSekolah: kelasSekolah || null,
                    email,
                    namaSekolah: namaSekolah || null,
                    namaOrangTua,
                    namaPenjemput: namaPenjemput || null,
                    noWhatsapp: noWhatsapp || null,
                    programId,
                    jadwalJson: JSON.stringify(jadwal),
                    kodeVoucher: kodeVoucher || null,
                    biayaPendaftaran: jumlahPembayaran,
                    diskon: voucherDiskon,
                    totalBiaya,
                    pembayaranId: paymentData.pembayaranId,
                    voucherId
                }
            });

            return {
                pendaftaranId: pendaftaranTemp.id,
                paymentInfo: paymentData
            };
        } catch (error) {
            logger.error('Error creating pendaftaran:', error);
            throw error;
        }
    }

    static async processPaidPendaftaran(pembayaranId) {
        try {
            // Begin transaction
            return await prisma.$transaction(async (tx) => {
                // Find the pendaftaran temp data
                const pendaftaranTemp = await tx.pendaftaranTemp.findUnique({
                    where: { pembayaranId }
                });

                if (!pendaftaranTemp) {
                    throw new Error(`No pendaftaran data found for payment ID ${pembayaranId}`);
                }

                // Create user
                const defaultPassword = this.#generateTemporaryPassword();
                const hashedPassword = await PasswordUtils.hashPassword(defaultPassword);

                const user = await tx.user.create({
                    data: {
                        email: pendaftaranTemp.email,
                        password: hashedPassword,
                        role: 'SISWA'
                    }
                });

                // Create siswa
                const siswa = await tx.siswa.create({
                    data: {
                        userId: user.id,
                        noWhatsapp: pendaftaranTemp.noWhatsapp,
                        namaMurid: pendaftaranTemp.namaMurid,
                        namaPanggilan: pendaftaranTemp.namaPanggilan,
                        tanggalLahir: pendaftaranTemp.tanggalLahir,
                        jenisKelamin: pendaftaranTemp.jenisKelamin,
                        alamat: pendaftaranTemp.alamat,
                        strataPendidikan: pendaftaranTemp.strataPendidikan,
                        kelasSekolah: pendaftaranTemp.kelasSekolah,
                        namaSekolah: pendaftaranTemp.namaSekolah,
                        namaOrangTua: pendaftaranTemp.namaOrangTua,
                        namaPenjemput: pendaftaranTemp.namaPenjemput,
                        isRegistered: true
                    }
                });

                // Create pendaftaran record
                const pendaftaran = await tx.pendaftaran.create({
                    data: {
                        siswaId: siswa.id,
                        biayaPendaftaran: pendaftaranTemp.biayaPendaftaran,
                        tanggalDaftar: new Date().toISOString().split('T')[0],
                        diskon: pendaftaranTemp.diskon,
                        totalBiaya: pendaftaranTemp.totalBiaya,
                        voucher_id: pendaftaranTemp.voucherId,
                        pembayaranId
                    }
                });

                // Parse jadwal JSON
                const jadwal = JSON.parse(pendaftaranTemp.jadwalJson);

                // Find the kelasProgram based on programId and jamMengajar
                let kelasProgram;
                if (jadwal && jadwal.length > 0) {
                    kelasProgram = await tx.kelasProgram.findFirst({
                        where: {
                            programId: pendaftaranTemp.programId,
                            hari: jadwal[0].hari,
                            jamMengajarId: jadwal[0].jamMengajarId
                        }
                    });
                }

                if (!kelasProgram) {
                    throw new Error('Kelas program not found for the selected program and schedule');
                }

                // Create program siswa
                const programSiswa = await tx.programSiswa.create({
                    data: {
                        siswaId: siswa.id,
                        programId: pendaftaranTemp.programId,
                        kelasProgramId: kelasProgram.id,
                        status: 'AKTIF',
                    }
                });

                // Create jadwal for program siswa
                for (const jadwalItem of jadwal) {
                    await tx.jadwalProgramSiswa.create({
                        data: {
                            programSiswaId: programSiswa.id,
                            hari: jadwalItem.hari,
                            jamMengajarId: jadwalItem.jamMengajarId
                        }
                    });
                }

                // Create initial status history
                await tx.riwayatStatusSiswa.create({
                    data: {
                        programSiswaId: programSiswa.id,
                        statusLama: 'TIDAK_AKTIF',
                        statusBaru: 'AKTIF',
                        tanggalPerubahan: new Date().toISOString().split('T')[0],
                        keterangan: 'Pendaftaran baru'
                    }
                });

                // Delete the temp pendaftaran data
                await tx.pendaftaranTemp.delete({
                    where: { id: pendaftaranTemp.id }
                });

                return {
                    success: true,
                    pendaftaran,
                    siswa,
                    programSiswa,
                    defaultPassword
                };
            });
        } catch (error) {
            logger.error('Error processing paid pendaftaran:', error);
            throw error;
        }
    }

    static #generateTemporaryPassword() {
        // Generate a random password with 8 characters
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
}

module.exports = PendaftaranService; 