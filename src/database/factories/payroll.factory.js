class PayrollFactory {
    static create(guruId, index = 0) {
        const currentDate = new Date();
        const month = currentDate.getMonth() - index;
        const adjustedDate = new Date(currentDate.getFullYear(), month, 1);

        const bulan = adjustedDate.toLocaleString('id-ID', { month: 'long' });
        const tahun = adjustedDate.getFullYear();
        const periode = `${bulan} ${tahun}`;

        // Base salary calculation based on class types and sessions
        const groupClassSessions = Math.floor(Math.random() * 20) + 10; // 10-30 sessions
        const privateClassSessions = Math.floor(Math.random() * 10) + 5; // 5-15 sessions
        const substituteClassSessions = Math.floor(Math.random() * 5); // 0-5 sessions
        const onlineClassSessions = Math.floor(Math.random() * 5); // 0-5 sessions

        // Calculate base salary based on session rates
        const gajiPokok = (
            (groupClassSessions * 35000) + // Rp 35,000 per group session
            (privateClassSessions * 35000) + // Rp 35,000 per private session
            (substituteClassSessions * 25000) + // Rp 25,000 per substitute session
            (onlineClassSessions * 25000) // Rp 25,000 per online session
        );

        // Calculate incentives (Rp 10,000 per attendance with minimum 2 SKS)
        const daysWithMinimumSKS = Math.floor(Math.random() * 20) + 5; // 5-25 days
        const insentif = daysWithMinimumSKS * 10000;

        // Calculate penalties
        const lateInstances = Math.floor(Math.random() * 5); // 0-5 times late
        const absentWithoutNotice = Math.floor(Math.random() * 2); // 0-2 times
        const absentWithoutLetter = Math.floor(Math.random() * 3); // 0-3 times

        const potongan = (
            (lateInstances * 10000) + // Rp 10,000 per late instance
            (absentWithoutNotice * 20000) + // Rp 20,000 per absence without notice
            (absentWithoutLetter * 10000) // Rp 10,000 per absence without letter
        );

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