class PeriodeSppFactory {
    static create(programSiswaId, voucherId = null, index = 0) {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() - index;
        const adjustedDate = new Date(year, month, 1);

        const bulan = adjustedDate.toLocaleString('id-ID', { month: 'long' });
        const tahun = adjustedDate.getFullYear();

        const tanggalTagihan = `${tahun}-${String(adjustedDate.getMonth() + 1).padStart(2, '0')}-01`;

        const jumlahTagihan = Math.floor(Math.random() * 300000) + 200000; // 200k-500k
        const diskon = voucherId ? Math.floor(jumlahTagihan * 0.1) : 0; // 10% discount if voucher
        const totalTagihan = jumlahTagihan - diskon;

        const statuses = ['UNPAID', 'PENDING', 'PAID', 'SETTLED', 'EXPIRED'];
        const statusWeight = [0.3, 0.1, 0.4, 0.1, 0.1]; // Weighted probabilities

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

        return {
            programSiswaId,
            bulan,
            tahun,
            tanggalTagihan,
            jumlahTagihan,
            diskon,
            totalTagihan,
            statusPembayaran: statuses[statusIndex],
            voucher_id: voucherId
        };
    }
}

module.exports = PeriodeSppFactory; 