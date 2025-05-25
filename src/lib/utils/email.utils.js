const { logger } = require('../config/logger.config');

class EmailUtils {
  static async sendWelcomeEmail(userData) {
    try {
      const { email, namaMurid, password, nis } = userData;
      
      const emailContent = this.generateWelcomeEmailContent({
        namaMurid,
        email,
        password,
        nis
      });

      logger.info(`Welcome email content generated for ${email}:`);
      logger.info(emailContent);

      return {
        success: true,
        recipient: email,
        subject: 'Selamat Datang di Surau Quran - Akun Anda Telah Aktif',
        content: emailContent
      };
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      throw error;
    }
  }

  static async sendPaymentReminderEmail(paymentData) {
    try {
      const { email, namaMurid, invoiceUrl, expireDate, amount } = paymentData;
      
      const emailContent = this.generatePaymentReminderContent({
        namaMurid,
        invoiceUrl,
        expireDate,
        amount
      });

      logger.info(`Payment reminder email content generated for ${email}:`);
      logger.info(emailContent);

      return {
        success: true,
        recipient: email,
        subject: 'Reminder Pembayaran Pendaftaran Surau Quran',
        content: emailContent
      };
    } catch (error) {
      logger.error('Error sending payment reminder email:', error);
      throw error;
    }
  }

  static async sendPaymentSuccessEmail(paymentData) {
    try {
      const { email, namaMurid, amount, paidAt } = paymentData;
      
      const emailContent = this.generatePaymentSuccessContent({
        namaMurid,
        amount,
        paidAt
      });

      logger.info(`Payment success email content generated for ${email}:`);
      logger.info(emailContent);

      return {
        success: true,
        recipient: email,
        subject: 'Pembayaran Berhasil - Surau Quran',
        content: emailContent
      };
    } catch (error) {
      logger.error('Error sending payment success email:', error);
      throw error;
    }
  }

  static generateWelcomeEmailContent({ namaMurid, email, password, nis }) {
    return `
=== SELAMAT DATANG DI SURAU QURAN ===

Assalamu'alaikum ${namaMurid},

Alhamdulillah, pendaftaran Anda telah berhasil dan akun Anda sudah aktif!

Detail Akun:
- Email: ${email}
- Password: ${password}
- NIS: ${nis}

PENTING: 
- Silakan login menggunakan email dan password di atas
- Segera ubah password Anda setelah login pertama
- Simpan NIS Anda untuk keperluan administrasi

Anda sekarang dapat mengakses sistem untuk:
- Melihat jadwal kelas
- Memantau kehadiran
- Melakukan pembayaran SPP
- Dan fitur lainnya

Jika ada pertanyaan, silakan hubungi admin kami.

Barakallahu fiikum,
Tim Surau Quran

=== SURAU QURAN MANAGEMENT SYSTEM ===
    `.trim();
  }

  static generatePaymentReminderContent({ namaMurid, invoiceUrl, expireDate, amount }) {
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);

    const formattedDate = new Date(expireDate).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
=== REMINDER PEMBAYARAN PENDAFTARAN ===

Assalamu'alaikum ${namaMurid},

Kami ingatkan bahwa pembayaran pendaftaran Anda belum diselesaikan.

Detail Pembayaran:
- Jumlah: ${formattedAmount}
- Batas Waktu: ${formattedDate}

Untuk menyelesaikan pembayaran, silakan klik link berikut:
${invoiceUrl}

PENTING:
- Pembayaran harus diselesaikan sebelum batas waktu
- Setelah batas waktu, link pembayaran akan expired
- Hubungi admin jika mengalami kesulitan

Barakallahu fiikum,
Tim Surau Quran

=== SURAU QURAN MANAGEMENT SYSTEM ===
    `.trim();
  }

  static generatePaymentSuccessContent({ namaMurid, amount, paidAt }) {
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);

    const formattedDate = new Date(paidAt).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
=== PEMBAYARAN BERHASIL ===

Assalamu'alaikum ${namaMurid},

Alhamdulillah, pembayaran Anda telah berhasil diproses!

Detail Pembayaran:
- Jumlah: ${formattedAmount}
- Tanggal: ${formattedDate}
- Status: LUNAS

Akun Anda akan segera diaktifkan dan detail login akan dikirim melalui email terpisah.

Terima kasih atas kepercayaan Anda.

Barakallahu fiikum,
Tim Surau Quran

=== SURAU QURAN MANAGEMENT SYSTEM ===
    `.trim();
  }

  static async sendSppReminderEmail(sppData) {
    try {
      const { email, namaMurid, periode, amount, dueDate } = sppData;
      
      const emailContent = this.generateSppReminderContent({
        namaMurid,
        periode,
        amount,
        dueDate
      });

      logger.info(`SPP reminder email content generated for ${email}:`);
      logger.info(emailContent);

      return {
        success: true,
        recipient: email,
        subject: `Reminder SPP ${periode} - Surau Quran`,
        content: emailContent
      };
    } catch (error) {
      logger.error('Error sending SPP reminder email:', error);
      throw error;
    }
  }

  static generateSppReminderContent({ namaMurid, periode, amount, dueDate }) {
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);

    const formattedDate = new Date(dueDate).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
=== REMINDER PEMBAYARAN SPP ===

Assalamu'alaikum ${namaMurid},

Kami ingatkan bahwa SPP bulan ${periode} sudah jatuh tempo.

Detail SPP:
- Periode: ${periode}
- Jumlah: ${formattedAmount}
- Jatuh Tempo: ${formattedDate}

Silakan lakukan pembayaran melalui sistem atau hubungi admin.

Barakallahu fiikum,
Tim Surau Quran

=== SURAU QURAN MANAGEMENT SYSTEM ===
    `.trim();
  }

 
}

module.exports = EmailUtils;