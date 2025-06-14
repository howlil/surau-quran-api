const EmailConfig = require('../config/email.config');
const { logger } = require('../config/logger.config');
const PasswordUtils = require('../utils/password.utils');

class EmailUtils {
  static async #sendEmail({ to, subject, html }) {
    try {
      const transporter = EmailConfig.getTransporter();
      const from = EmailConfig.getFromAddress();

      logger.info('Sending email:', { to, subject, from });

      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html
      });

      logger.info('Email sent successfully:', {
        messageId: info.messageId,
        to,
        subject
      });

      return info;
    } catch (error) {
      logger.error('Error sending email:', {
        error: error.message,
        stack: error.stack,
        to,
        subject
      });
      throw error;
    }
  }

  static async sendPasswordResetEmail({ email, resetLink }) {
    if (!email || !resetLink) {
      throw new Error('Email and reset link are required');
    }

    const subject = 'Reset Password - Surau Quran';
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Reset Password</h2>
                <p>Halo,</p>
                <p>Kami menerima permintaan untuk mereset password akun Anda. Klik tombol di bawah untuk mereset password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" 
                       style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                        Reset Password
                    </a>
                </div>
                <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
                <p>Link ini akan kadaluarsa dalam 30 menit.</p>
                <hr style="margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">
                    Email ini dikirim secara otomatis, mohon tidak membalas email ini.
                    Jika Anda membutuhkan bantuan, silakan hubungi admin.
                </p>
            </div>
        `;

    return this.#sendEmail({ to: email, subject, html });
  }

  static async sendPasswordChangedEmail({ email }) {
    if (!email) {
      throw new Error('Email is required');
    }

    const subject = 'Password Berhasil Diubah - Surau Quran';
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Berhasil Diubah</h2>
                <p>Halo,</p>
                <p>Password akun Anda di Surau Quran telah berhasil diubah.</p>
                <p>Jika Anda tidak melakukan perubahan ini, segera hubungi admin kami.</p>
                <hr style="margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">
                    Email ini dikirim secara otomatis, mohon tidak membalas email ini.
                    Jika Anda membutuhkan bantuan, silakan hubungi admin.
                </p>
            </div>
        `;

    return this.#sendEmail({ to: email, subject, html });
  }

  static async sendWelcomeEmail({ email, name, password }) {
    if (!email || !name) {
      throw new Error('Email and name are required');
    }

    const subject = 'Selamat Datang di Surau Quran';
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Selamat Datang di Surau Quran</h2>
                <p>Halo ${name},</p>
                <p>Terima kasih telah bergabung dengan Surau Quran. Kami senang Anda bergabung dengan kami.</p>
                <p>Anda sekarang dapat mengakses semua fitur yang tersedia di platform kami.</p>
                ${password ? `
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Informasi Login:</strong></p>
                    <p style="margin: 5px 0;">Email: ${email}</p>
                    <p style="margin: 5px 0;">Password: ${password}</p>
                    <p style="margin: 10px 0 0 0; color: #dc3545; font-size: 12px;">
                        Harap segera ubah password Anda setelah login pertama.
                    </p>
                </div>
                ` : ''}
                <hr style="margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">
                    Email ini dikirim secara otomatis, mohon tidak membalas email ini.
                    Jika Anda membutuhkan bantuan, silakan hubungi admin.
                </p>
            </div>
        `;

    return this.#sendEmail({ to: email, subject, html });
  }

  static async sendPaymentReminder({ email, name, amount, dueDate }) {
    if (!email || !name || !amount || !dueDate) {
      throw new Error('Email, name, amount, and due date are required');
    }

    const subject = 'Pengingat Pembayaran - Surau Quran';
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Pengingat Pembayaran</h2>
                <p>Halo ${name},</p>
                <p>Ini adalah pengingat bahwa Anda memiliki pembayaran yang akan jatuh tempo:</p>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin: 10px 0;"><strong>Jumlah:</strong> Rp ${amount.toLocaleString()}</li>
                    <li style="margin: 10px 0;"><strong>Jatuh Tempo:</strong> ${new Date(dueDate).toLocaleDateString()}</li>
                </ul>
                <p>Mohon segera lakukan pembayaran untuk menghindari keterlambatan.</p>
                <hr style="margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">
                    Email ini dikirim secara otomatis, mohon tidak membalas email ini.
                    Jika Anda membutuhkan bantuan, silakan hubungi admin.
                </p>
            </div>
        `;

    return this.#sendEmail({ to: email, subject, html });
  }

  static async sendPaymentSuccess({ email, name, amount, paymentDate }) {
    if (!email || !name || !amount || !paymentDate) {
      throw new Error('Email, name, amount, and payment date are required');
    }

    const subject = 'Konfirmasi Pembayaran Berhasil - Surau Quran';
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Pembayaran Berhasil</h2>
                <p>Halo ${name},</p>
                <p>Pembayaran Anda telah berhasil diproses:</p>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin: 10px 0;"><strong>Jumlah:</strong> Rp ${amount.toLocaleString()}</li>
                    <li style="margin: 10px 0;"><strong>Tanggal:</strong> ${new Date(paymentDate).toLocaleDateString()}</li>
                </ul>
                <p>Terima kasih atas pembayaran Anda.</p>
                <hr style="margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">
                    Email ini dikirim secara otomatis, mohon tidak membalas email ini.
                    Jika Anda membutuhkan bantuan, silakan hubungi admin.
                </p>
            </div>
        `;

    return this.#sendEmail({ to: email, subject, html });
  }
}

module.exports = EmailUtils;