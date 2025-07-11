const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const moment = require('moment');
const { DATE_FORMATS } = require('../../lib/constants');
const XenditUtils = require('../../lib/utils/xendit.utils');
const EmailUtils = require('../../lib/utils/email.utils');
const WhatsAppUtils = require('../../lib/utils/whatsapp.utils');

class SppReminderCronService {
    static async sendSppReminders() {
        try {
            const currentDate = moment();
            const currentMonth = currentDate.format('MMMM');
            const currentYear = currentDate.year();

            logger.info(`Starting SPP reminder process for ${currentMonth} ${currentYear}`);

            // Get all unpaid SPP for current month
            const unpaidSpp = await prisma.periodeSpp.findMany({
                where: {
                    bulan: currentMonth,
                    tahun: currentYear,
                    pembayaranId: null, // Belum dibayar
                    programSiswa: {
                        status: 'AKTIF'
                    }
                },
                include: {
                    programSiswa: {
                        include: {
                            siswa: {
                                include: {
                                    user: {
                                        select: {
                                            email: true
                                        }
                                    }
                                }
                            },
                            program: {
                                select: {
                                    namaProgram: true
                                }
                            }
                        }
                    }
                }
            });

            if (unpaidSpp.length === 0) {
                logger.info('No unpaid SPP found for current month');
                return { message: 'No unpaid SPP found for current month' };
            }

            logger.info(`Found ${unpaidSpp.length} unpaid SPP records`);

            const results = [];
            const errors = [];

            for (const spp of unpaidSpp) {
                try {
                    const result = await this.processSppReminder(spp);
                    results.push(result);
                } catch (error) {
                    logger.error(`Error processing SPP reminder for ${spp.id}:`, error);
                    errors.push({
                        sppId: spp.id,
                        siswaId: spp.programSiswa.siswa.id,
                        error: error.message
                    });
                }
            }

            return {
                message: `Processed ${results.length} SPP reminders successfully`,
                successCount: results.length,
                errorCount: errors.length,
                results,
                errors
            };

        } catch (error) {
            logger.error('Error in SPP reminder cron job:', error);
            throw error;
        }
    }

    static async processSppReminder(spp) {
        const siswa = spp.programSiswa.siswa;
        const program = spp.programSiswa.program;
        const user = siswa.user;

        // Format amount
        const formattedAmount = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(spp.totalTagihan);

        // Create Xendit invoice if not exists
        let xenditInvoice = null;
        if (!spp.pembayaranId) {
            xenditInvoice = await this.createXenditInvoice(spp, siswa, program);
        }

        // Send email reminder
        await this.sendEmailReminder(spp, siswa, program, formattedAmount, xenditInvoice);

        // Send WhatsApp reminder (if phone number available)
        if (siswa.noWhatsapp) {
            await this.sendWhatsAppReminder(spp, siswa, program, formattedAmount, xenditInvoice);
        }

        return {
            sppId: spp.id,
            siswaId: siswa.id,
            namaSiswa: siswa.namaMurid,
            email: user?.email,
            noWhatsapp: siswa.noWhatsapp,
            program: program.namaProgram,
            amount: formattedAmount,
            xenditInvoiceId: xenditInvoice?.id,
            paymentUrl: xenditInvoice?.invoice_url
        };
    }

    static async createXenditInvoice(spp, siswa, program) {
        try {
            const externalId = `SPP-${spp.id}-${moment().format('YYYYMMDDHHmmss')}`;

            const invoiceData = {
                external_id: externalId,
                amount: Number(spp.totalTagihan),
                description: `Pembayaran SPP ${program.namaProgram} - ${siswa.namaMurid} (${spp.bulan} ${spp.tahun})`,
                invoice_duration: 86400, // 24 hours
                customer: {
                    given_names: siswa.namaMurid,
                    email: siswa.user?.email,
                    mobile_number: siswa.noWhatsapp ? `+62${siswa.noWhatsapp.replace(/^0+/, '')}` : undefined
                },
                customer_notification_preference: {
                    invoice_created: ['whatsapp', 'email'],
                    invoice_reminder: ['whatsapp', 'email'],
                    invoice_paid: ['whatsapp', 'email']
                },
                success_redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`,
                failure_redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failed`,
                currency: 'IDR',
                items: [
                    {
                        name: `SPP ${program.namaProgram}`,
                        quantity: 1,
                        price: Number(spp.totalTagihan), // Gunakan totalTagihan yang sudah termasuk diskon
                        category: 'Education'
                    }
                ],
                payment_methods: [
                    'CREDIT_CARD',
                    'BCA',
                    'BNI',
                    'BSI',
                    'BRI',
                    'MANDIRI',
                    'PERMATA',
                    'OVO',
                    'DANA',
                    'SHOPEEPAY',
                    'LINKAJA',
                    'QRIS'
                ],
                metadata: {
                    spp_id: spp.id,
                    siswa_id: siswa.id,
                    program_id: program.id,
                    bulan: spp.bulan,
                    tahun: spp.tahun.toString()
                }
            };

            // Add discount if exists
            if (spp.diskon && Number(spp.diskon) > 0) {
                invoiceData.items.push({
                    name: 'Diskon',
                    quantity: 1,
                    price: -Number(spp.diskon),
                    category: 'Discount'
                });
            }

            const xenditInvoice = await XenditUtils.createInvoice(invoiceData);

            // Create payment record
            const pembayaran = await prisma.pembayaran.create({
                data: {
                    tipePembayaran: 'SPP',
                    jumlahTagihan: spp.totalTagihan,
                    statusPembayaran: 'PENDING',
                    tanggalPembayaran: moment().format(DATE_FORMATS.DEFAULT)
                }
            });

            // Create Xendit payment record
            await prisma.xenditPayment.create({
                data: {
                    pembayaranId: pembayaran.id,
                    xenditInvoiceId: xenditInvoice.id,
                    xenditExternalId: xenditInvoice.external_id,
                    xenditPaymentUrl: xenditInvoice.invoice_url,
                    xenditPaymentChannel: 'INVOICE',
                    xenditExpireDate: xenditInvoice.expiry_date,
                    xenditStatus: xenditInvoice.status
                }
            });

            // Update SPP with payment ID
            await prisma.periodeSpp.update({
                where: { id: spp.id },
                data: { pembayaranId: pembayaran.id }
            });

            logger.info(`Created Xendit invoice for SPP ${spp.id}: ${xenditInvoice.id}`);
            return xenditInvoice;

        } catch (error) {
            logger.error(`Error creating Xendit invoice for SPP ${spp.id}:`, error);
            throw error;
        }
    }

    static async sendEmailReminder(spp, siswa, program, formattedAmount, xenditInvoice) {
        try {
            if (!siswa.user?.email) {
                logger.warn(`No email found for siswa ${siswa.id}`);
                return;
            }

            const emailData = {
                to: siswa.user.email,
                subject: `Reminder Pembayaran SPP - ${program.namaProgram}`,
                template: 'spp-reminder',
                context: {
                    namaSiswa: siswa.namaMurid,
                    namaProgram: program.namaProgram,
                    bulan: spp.bulan,
                    tahun: spp.tahun,
                    jumlahTagihan: formattedAmount,
                    paymentUrl: xenditInvoice?.invoice_url,
                    dueDate: moment().add(7, 'days').format('DD MMMM YYYY'),
                    logoUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/uploads/assets/surau.png`
                }
            };

            await EmailUtils.sendEmail(emailData);
            logger.info(`Email reminder sent to ${siswa.user.email} for SPP ${spp.id}`);

        } catch (error) {
            logger.error(`Error sending email reminder for SPP ${spp.id}:`, error);
            throw error;
        }
    }

    static async sendWhatsAppReminder(spp, siswa, program, formattedAmount, xenditInvoice) {
        try {
            if (!siswa.noWhatsapp) {
                logger.warn(`No WhatsApp number found for siswa ${siswa.id}`);
                return;
            }

            // Validate phone number
            if (!WhatsAppUtils.validatePhoneNumber(siswa.noWhatsapp)) {
                logger.warn(`Invalid WhatsApp number format for siswa ${siswa.id}: ${siswa.noWhatsapp}`);
                return;
            }

            const sppData = {
                namaSiswa: siswa.namaMurid,
                namaProgram: program.namaProgram,
                bulan: spp.bulan,
                tahun: spp.tahun,
                jumlahTagihan: formattedAmount,
                paymentUrl: xenditInvoice?.invoice_url,
                dueDate: moment().add(7, 'days').format('DD MMMM YYYY')
            };

            // Send WhatsApp message using Twilio
            const result = await WhatsAppUtils.sendSppReminder(siswa.noWhatsapp, sppData);

            if (result.success) {
                logger.info(`WhatsApp reminder sent successfully to ${siswa.noWhatsapp} for SPP ${spp.id}`, {
                    messageSid: result.messageSid,
                    status: result.status
                });
            } else {
                logger.error(`Failed to send WhatsApp reminder to ${siswa.noWhatsapp} for SPP ${spp.id}:`, {
                    error: result.error,
                    code: result.code
                });
            }

            return result;

        } catch (error) {
            logger.error(`Error sending WhatsApp reminder for SPP ${spp.id}:`, error);
            throw error;
        }
    }

    static generateWhatsAppMessage(spp, siswa, program, formattedAmount, xenditInvoice) {
        const dueDate = moment().add(7, 'days').format('DD MMMM YYYY');

        return `Assalamu'alaikum Warrahmatullahi Wabarakatuh

Halo ${siswa.namaMurid} 👋

Ini adalah pengingat pembayaran SPP untuk program *${program.namaProgram}*.

📋 *Detail Pembayaran:*
• Program: ${program.namaProgram}
• Periode: ${spp.bulan} ${spp.tahun}
• Jumlah: ${formattedAmount}
• Jatuh Tempo: ${dueDate}

💳 *Cara Pembayaran:*
1. Klik link pembayaran di bawah ini
2. Pilih metode pembayaran yang diinginkan
3. Ikuti instruksi pembayaran
4. Simpan bukti pembayaran

🔗 *Link Pembayaran:*
${xenditInvoice?.invoice_url || 'Link pembayaran akan dikirim melalui email'}

⚠️ *Penting:*
• Pembayaran akan expired dalam 24 jam
• Pastikan pembayaran dilakukan sebelum jatuh tempo
• Hubungi admin jika ada kendala

Terima kasih atas perhatiannya 🙏

*Surau Quran*
📞 Admin: ${process.env.ADMIN_PHONE || '08123456789'}
📧 Email: ${process.env.ADMIN_EMAIL || 'admin@surauquran.com'}`;
    }



}

module.exports = SppReminderCronService; 