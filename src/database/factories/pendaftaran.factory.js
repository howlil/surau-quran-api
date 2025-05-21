class PendaftaranFactory {
    static create(siswaId, voucherId = null) {
        const biayaPendaftaran = Math.floor(Math.random() * 300000) + 200000; // 200k-500k
        const diskon = voucherId ? Math.floor(biayaPendaftaran * 0.2) : 0; // 20% discount if voucher
        const totalBiaya = biayaPendaftaran - diskon;

        // Random date in the last 6 months
        const currentDate = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
        const randomDate = new Date(sixMonthsAgo.getTime() + Math.random() * (currentDate.getTime() - sixMonthsAgo.getTime()));
        const tanggalDaftar = randomDate.toISOString().split('T')[0];

        return {
            siswaId,
            biayaPendaftaran,
            tanggalDaftar,
            diskon,
            totalBiaya,
            statusVerifikasi: Math.random() > 0.3 ? 'DIVERIFIKASI' : 'MENUNGGU',
            voucher_id: voucherId
        };
    }
}

module.exports = PendaftaranFactory; 