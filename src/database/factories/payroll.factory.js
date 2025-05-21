class PayrollFactory {
    static create(guruId, index = 0) {
        const currentDate = new Date();
        const month = currentDate.getMonth() - index;
        const adjustedDate = new Date(currentDate.getFullYear(), month, 1);

        const bulan = adjustedDate.toLocaleString('id-ID', { month: 'long' });
        const tahun = adjustedDate.getFullYear();
        const periode = `${bulan} ${tahun}`;

        const gajiPokok = Math.floor(Math.random() * 3000000) + 2000000; // 2-5 million
        const insentif = Math.floor(Math.random() * 1000000); // 0-1 million
        const potongan = Math.floor(Math.random() * 500000); // 0-500k
        const totalGaji = gajiPokok + insentif - potongan;

        const statuses = ['DRAFT', 'DIPROSES', 'SELESAI', 'GAGAL'];
        const statusWeights = [0.2, 0.2, 0.5, 0.1]; // Weighted probabilities

        let statusIndex = 0;
        const randomVal = Math.random();
        let cumulativeWeight = 0;

        for (let i = 0; i < statusWeights.length; i++) {
            cumulativeWeight += statusWeights[i];
            if (randomVal <= cumulativeWeight) {
                statusIndex = i;
                break;
            }
        }

        return {
            guruId,
            periode,
            bulan,
            tahun,
            gajiPokok,
            insentif,
            potongan,
            totalGaji,
            status: statuses[statusIndex]
        };
    }
}

module.exports = PayrollFactory; 