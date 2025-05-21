class VoucherFactory {
    static create(index) {
        const voucherPrefixes = ['NEW', 'WELCOME', 'PROMO', 'SPECIAL', 'DISKON', 'RAMADHAN', 'TAHFIDZ', 'QURAN', 'SURAU'];
        const randomPrefix = voucherPrefixes[Math.floor(Math.random() * voucherPrefixes.length)];
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

        const tipe = Math.random() > 0.5 ? 'PERSENTASE' : 'NOMINAL';
        const nominal = tipe === 'PERSENTASE'
            ? Math.floor(Math.random() * 50) + 10 // 10-60% discount
            : Math.floor(Math.random() * 200000) + 50000; // 50k-250k discount

        return {
            kodeVoucher: `${randomPrefix}${randomSuffix}`,
            tipe,
            nominal,
            isActive: Math.random() > 0.2, // 80% chance to be active
            jumlahPenggunaan: Math.floor(Math.random() * 100)
        };
    }
}

module.exports = VoucherFactory; 