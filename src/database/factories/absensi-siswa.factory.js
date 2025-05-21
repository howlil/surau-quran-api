class AbsensiSiswaFactory {
    static create(kelasProgramId, siswaId, index = 0) {
        // Generate date in the last 3 months
        const currentDate = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(currentDate.getMonth() - 3);

        const randomTimeOffset = Math.random() * (currentDate.getTime() - threeMonthsAgo.getTime());
        const randomDate = new Date(threeMonthsAgo.getTime() + randomTimeOffset - (index * 24 * 60 * 60 * 1000));
        const tanggal = randomDate.toISOString().split('T')[0];

        const statuses = ['HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT'];
        const statusWeights = [0.7, 0.1, 0.1, 0.1]; // Weighted probabilities

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
            kelasProgramId,
            siswaId,
            tanggal,
            statusKehadiran: statuses[statusIndex]
        };
    }
}

module.exports = AbsensiSiswaFactory; 