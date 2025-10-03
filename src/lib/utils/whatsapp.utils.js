// utils/whatsapp.utils.js
const WhatsappConfig = require('../config/whatsapp.config'); // versi Cloud API yg kita buat
const { logger } = require('../config/logger.config');

class WhatsAppUtils {
    static async sendMessage(phoneNumber, message, options = {}) {
        try {
            const client = WhatsappConfig.getClient();

            if (!client || !WhatsappConfig.isConfigured()) {
                logger.warn('WhatsApp Cloud API not configured. Message will not be sent.');
                return {
                    success: false,
                    error: 'WhatsApp Cloud API not configured',
                    message: 'WhatsApp service not available',
                };
            }

            const formattedPhone = this.formatPhoneNumber(phoneNumber);
            if (!formattedPhone) {
                throw new Error('Invalid phone number format');
            }

            // options yang sering dipakai: { preview_url: false }
            const payload = {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'text',
                text: {
                    body: message,
                    preview_url: typeof options.preview_url === 'boolean' ? options.preview_url : false,
                },
            };

            logger.info('Sending WhatsApp text message', {
                to: formattedPhone,
                messageLength: message?.length || 0,
                hasOptions: Object.keys(options || {}).length > 0,
            });

            const result = await client('/messages', payload);

            const messageId = result?.messages?.[0]?.id || null;

            logger.info('WhatsApp text message sent successfully', {
                messageId,
                to: formattedPhone,
            });

            return {
                success: true,
                messageId,
                to: formattedPhone,
                raw: result,
            };
        } catch (error) {
            logger.error('Error sending WhatsApp text message', {
                error: error.message,
                details: error.details,
                phoneNumber,
                messageLength: message?.length || 0,
            });

            return {
                success: false,
                error: error.message,
                details: error.details,
            };
        }
    }

  
    static async sendTemplateMessage(phoneNumber, templateName, templateOptions = {}) {
        try {
            const client = WhatsappConfig.getClient();

            if (!client || !WhatsappConfig.isConfigured()) {
                logger.warn('WhatsApp Cloud API not configured. Template message will not be sent.');
                return {
                    success: false,
                    error: 'WhatsApp Cloud API not configured',
                    message: 'WhatsApp service not available',
                };
            }

            const formattedPhone = this.formatPhoneNumber(phoneNumber);
            if (!formattedPhone) {
                throw new Error('Invalid phone number format');
            }

            const {
                languageCode = 'id',
                bodyParams = [],
                headerParams = [],
                buttonParams = [], // [{ type:'payload'|'text', sub_type:'quick_reply'|'url', index: '0', param: 'XYZ' }]
            } = templateOptions;

            // Susun components sesuai spesifikasi Cloud API
            const components = [];

            if (headerParams.length) {
                components.push({
                    type: 'header',
                    parameters: headerParams.map((v) => this.#wrapParam(v)),
                });
            }

            if (bodyParams.length) {
                components.push({
                    type: 'body',
                    parameters: bodyParams.map((v) => this.#wrapParam(v)),
                });
            }

            if (buttonParams.length) {
                // Untuk setiap tombol, harus kirim komponen terpisah dengan index
                for (const btn of buttonParams) {
                    components.push({
                        type: 'button',
                        sub_type: btn.sub_type || 'quick_reply', // atau 'url'
                        index: btn.index || '0',
                        parameters: [this.#wrapParam(btn.param, btn.type)],
                    });
                }
            }

            const payload = {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: languageCode },
                    ...(components.length ? { components } : {}),
                },
            };

            logger.info('Sending WhatsApp template message', {
                to: formattedPhone,
                templateName,
                languageCode,
                hasBodyParams: bodyParams.length > 0,
            });

            const result = await client('/messages', payload);
            const messageId = result?.messages?.[0]?.id || null;

            logger.info('WhatsApp template message sent successfully', {
                messageId,
                to: formattedPhone,
            });

            return {
                success: true,
                messageId,
                to: formattedPhone,
                raw: result,
            };
        } catch (error) {
            logger.error('Error sending WhatsApp template message', {
                error: error.message,
                details: error.details,
                phoneNumber,
                templateName,
            });

            return {
                success: false,
                error: error.message,
                details: error.details,
            };
        }
    }


    static #wrapParam(value, explicitType) {
      
        const type = explicitType || 'text';
        if (type === 'payload') {
            return { type: 'payload', payload: String(value) };
        }
        return { type: 'text', text: String(value) };
    }

    static formatPhoneNumber(phoneNumber) {
        if (!phoneNumber) return null;

        // Hapus non-digit
        let cleaned = phoneNumber.replace(/\D/g, '');

        // Indonesia: 08xx -> 628xx
        if (cleaned.startsWith('62')) {
            return cleaned;
        } else if (cleaned.startsWith('0')) {
            return '62' + cleaned.substring(1);
        } else if (cleaned.length === 10 || cleaned.length === 11) {
            // asumsikan lokal (tanpa 0), misal 812xxxxxxx
            return '62' + cleaned;
        }

        // Jika sudah internasional non-62 dan panjang wajar
        if (cleaned.length >= 10 && cleaned.length <= 15) {
            return cleaned;
        }

        return null;
    }

    static validatePhoneNumber(phoneNumber) {
        const formatted = this.formatPhoneNumber(phoneNumber);
        return formatted !== null;
    }

    static async sendBulkMessages(recipients, message, options = {}) {
        const results = [];
        const errors = [];

        for (const recipient of recipients) {
            try {
                const r = await this.sendMessage(recipient.phoneNumber, message, options);
                if (r.success) {
                    results.push({ phoneNumber: recipient.phoneNumber, ...r });
                } else {
                    errors.push({ phoneNumber: recipient.phoneNumber, error: r.error, details: r.details });
                }
            } catch (e) {
                errors.push({ phoneNumber: recipient.phoneNumber, error: e.message });
            }
        }

        return {
            totalSent: results.length,
            totalErrors: errors.length,
            results,
            errors,
        };
    }


    static async sendSppReminder(phoneNumber, sppData) {
        const message = this.generateSppReminderMessage(sppData);
        return this.sendMessage(phoneNumber, message);
    }

    static async sendPaymentSuccessWhatsApp(phoneNumber, paymentData) {
        const message = this.generatePaymentSuccessMessage(paymentData);
        return this.sendMessage(phoneNumber, message);
    }

        static generateSppReminderMessage(sppData) {
            const {
                namaSiswa,
                namaProgram,
                bulan,
                tahun,
                jumlahTagihan,
                paymentUrl,
                dueDate,
            } = sppData;

            return `Assalamu'alaikum Warrahmatullahi Wabarakatuh
    
    Halo ${namaSiswa} 👋
    
    Ini adalah pengingat pembayaran SPP untuk program *${namaProgram}*.
    
    📋 *Detail Pembayaran:*
    • Program: ${namaProgram}
    • Periode: ${bulan} ${tahun}
    • Jumlah: ${jumlahTagihan}
    • Jatuh Tempo: ${dueDate}
    
    💳 *Cara Pembayaran:*
    1. Klik link pembayaran di bawah ini
    2. Pilih metode pembayaran yang diinginkan
    3. Ikuti instruksi pembayaran
    4. Simpan bukti pembayaran
    
    🔗 *Link Pembayaran:*
    ${paymentUrl || 'Link pembayaran akan dikirim melalui email'}
    
    ⚠️ *Penting:*
    • Pembayaran akan expired dalam 24 jam
    • Pastikan pembayaran dilakukan sebelum jatuh tempo
    • Hubungi admin jika ada kendala
    
    Terima kasih atas perhatiannya 🙏
    
    *Surau Quran*
    📞 Admin: ${process.env.ADMIN_PHONE || '08123456789'}
    📧 Email: ${process.env.ADMIN_EMAIL || 'admin@surauquran.com'}`;
        }

        static generatePaymentSuccessMessage(paymentData) {
            const {
                namaSiswa,
                namaProgram,
                jumlahTagihan,
                tanggalPembayaran,
                metodePembayaran,
                invoiceId,
                periode,
            } = paymentData;

            const formattedDate = new Date(tanggalPembayaran).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

            return `Assalamu'alaikum Warrahmatullahi Wabarakatuh
    
    Halo ${namaSiswa} 👋
    
    Alhamdulillah, pembayaran Anda telah berhasil diproses! 🎉
    
    📋 *Detail Pembayaran:*
    • Program: ${namaProgram}
    ${periode ? `• Periode: ${periode}` : ''}
    • Jumlah: ${jumlahTagihan}
    • Tanggal: ${formattedDate}
    • Metode: ${metodePembayaran || 'Online Payment'}
    • Invoice ID: ${invoiceId}
    
    ✅ *Status: Pembayaran Berhasil*
    
    Terima kasih atas kepercayaan Anda kepada Surau Quran. Pembayaran Anda telah kami terima dan diproses dengan baik.
    
    📚 *Informasi Kelas:*
    • Kelas akan berjalan sesuai jadwal yang telah ditentukan
    • Silakan cek aplikasi untuk informasi jadwal terbaru
    • Hubungi guru jika ada pertanyaan tentang materi
    
    🙏 *Doa:*
    Semoga Allah SWT memberikan keberkahan dalam belajar dan mengamalkan ilmu yang diperoleh.
    
    *Surau Quran*
    📞 Admin: ${process.env.ADMIN_PHONE || '08123456789'}
    📧 Email: ${process.env.ADMIN_EMAIL || 'admin@surauquran.com'}
    🌐 Website: ${process.env.FRONTEND_URL || 'https://surauquran.com'}`;
        }
    }

module.exports = WhatsAppUtils;
