class PembayaranFactory {
    static create(jumlahTagihan, tipePembayaran = null) {
        const metodePembayaran = ['TUNAI', 'VIRTUAL_ACCOUNT', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QR_CODE'][Math.floor(Math.random() * 6)];

        const statuses = ['UNPAID', 'PENDING', 'PAID', 'SETTLED', 'EXPIRED'];
        const statusWeight = [0.2, 0.1, 0.4, 0.2, 0.1]; // Weighted probabilities

        let statusIndex = 0;
        const randomVal = Math.random();
        let cumulativeWeight = 0;

        for (let i = 0; i < statusWeight.length; i++) {
            cumulativeWeight += statusWeight[i];
            if (randomVal <= cumulativeWeight) {
                statusIndex = i;
                break;
            }
        }

        // Random date in the last 3 months
        const currentDate = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(currentDate.getMonth() - 3);
        const randomDate = new Date(threeMonthsAgo.getTime() + Math.random() * (currentDate.getTime() - threeMonthsAgo.getTime()));
        const tanggalPembayaran = randomDate.toISOString().split('T')[0];

        return {
            tipePembayaran: tipePembayaran || (Math.random() > 0.5 ? 'PENDAFTARAN' : 'SPP'),
            metodePembayaran,
            jumlahTagihan,
            statusPembayaran: statuses[statusIndex],
            tanggalPembayaran
        };
    }
}

module.exports = PembayaranFactory; 