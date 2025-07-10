const TwilioConfig = require('../config/twilio.config');
const { logger } = require('../config/logger.config');

class WhatsAppUtils {
    static async sendMessage(phoneNumber, message, options = {}) {
        try {
            const client = TwilioConfig.getClient();
            const config = TwilioConfig.getConfig();

            if (!client || !TwilioConfig.isConfigured()) {
                logger.warn('Twilio not configured. WhatsApp message will not be sent.');
                return {
                    success: false,
                    error: 'Twilio not configured',
                    message: 'WhatsApp service not available'
                };
            }

            // Format phone number for WhatsApp
            const formattedPhone = this.formatPhoneNumber(phoneNumber);

            if (!formattedPhone) {
                throw new Error('Invalid phone number format');
            }

            // Prepare message data
            const messageData = {
                from: `whatsapp:${config.whatsappNumber}`,
                to: `whatsapp:${formattedPhone}`,
                body: message,
                ...options
            };

            logger.info('Sending WhatsApp message:', {
                to: formattedPhone,
                messageLength: message.length,
                hasOptions: Object.keys(options).length > 0
            });

            // Send message via Twilio
            const result = await client.messages.create(messageData);

            logger.info('WhatsApp message sent successfully:', {
                messageSid: result.sid,
                status: result.status,
                to: formattedPhone
            });

            return {
                success: true,
                messageSid: result.sid,
                status: result.status,
                to: formattedPhone
            };

        } catch (error) {
            logger.error('Error sending WhatsApp message:', {
                error: error.message,
                phoneNumber,
                messageLength: message?.length || 0
            });

            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    }

    static async sendTemplateMessage(phoneNumber, templateName, templateData = {}) {
        try {
            const client = TwilioConfig.getClient();
            const config = TwilioConfig.getConfig();

            if (!client || !TwilioConfig.isConfigured()) {
                logger.warn('Twilio not configured. WhatsApp template message will not be sent.');
                return {
                    success: false,
                    error: 'Twilio not configured',
                    message: 'WhatsApp service not available'
                };
            }

            // Format phone number for WhatsApp
            const formattedPhone = this.formatPhoneNumber(phoneNumber);

            if (!formattedPhone) {
                throw new Error('Invalid phone number format');
            }

            // Prepare template message data
            const messageData = {
                from: `whatsapp:${config.whatsappNumber}`,
                to: `whatsapp:${formattedPhone}`,
                contentSid: templateName,
                contentVariables: JSON.stringify(templateData)
            };

            logger.info('Sending WhatsApp template message:', {
                to: formattedPhone,
                templateName,
                templateData
            });

            // Send template message via Twilio
            const result = await client.messages.create(messageData);

            logger.info('WhatsApp template message sent successfully:', {
                messageSid: result.sid,
                status: result.status,
                to: formattedPhone
            });

            return {
                success: true,
                messageSid: result.sid,
                status: result.status,
                to: formattedPhone
            };

        } catch (error) {
            logger.error('Error sending WhatsApp template message:', {
                error: error.message,
                phoneNumber,
                templateName
            });

            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    }

    static formatPhoneNumber(phoneNumber) {
        if (!phoneNumber) {
            return null;
        }

        // Remove all non-digit characters
        let cleaned = phoneNumber.replace(/\D/g, '');

        // Handle Indonesian phone numbers
        if (cleaned.startsWith('62')) {
            // Already in international format
            return cleaned;
        } else if (cleaned.startsWith('0')) {
            // Convert 08xx to 628xx
            return '62' + cleaned.substring(1);
        } else if (cleaned.length === 10 || cleaned.length === 11) {
            // Assume it's a local number starting with 8
            return '62' + cleaned;
        }

        // If it's already in international format but doesn't start with 62
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
                const result = await this.sendMessage(recipient.phoneNumber, message, options);

                if (result.success) {
                    results.push({
                        phoneNumber: recipient.phoneNumber,
                        ...result
                    });
                } else {
                    errors.push({
                        phoneNumber: recipient.phoneNumber,
                        error: result.error
                    });
                }
            } catch (error) {
                errors.push({
                    phoneNumber: recipient.phoneNumber,
                    error: error.message
                });
            }
        }

        return {
            totalSent: results.length,
            totalErrors: errors.length,
            results,
            errors
        };
    }

    static async sendSppReminder(phoneNumber, sppData) {
        const message = this.generateSppReminderMessage(sppData);
        return await this.sendMessage(phoneNumber, message);
    }

    static generateSppReminderMessage(sppData) {
        const {
            namaSiswa,
            namaProgram,
            bulan,
            tahun,
            jumlahTagihan,
            paymentUrl,
            dueDate
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
}

module.exports = WhatsAppUtils; 