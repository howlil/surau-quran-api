class AbsensiGuruFactory {
    static create(kelasProgramId, guruId, payrollId = null, index = 0) {
        // Generate date in the last 3 months
        const currentDate = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(currentDate.getMonth() - 3);

        const randomTimeOffset = Math.random() * (currentDate.getTime() - threeMonthsAgo.getTime());
        const randomDate = new Date(threeMonthsAgo.getTime() + randomTimeOffset - (index * 24 * 60 * 60 * 1000));
        const tanggal = randomDate.toISOString().split('T')[0];

        // Random jam masuk between 7 AM and 7 PM
        const startHour = Math.floor(Math.random() * 12) + 7;
        const startMinute = Math.floor(Math.random() * 60);
        const jamMasuk = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;

        // Teaching duration 1-3 hours
        const endHour = startHour + Math.floor(Math.random() * 3) + 1;
        const endMinute = startMinute;
        const jamKeluar = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

        // SKS (teaching credits): 1-4
        const sks = Math.floor(Math.random() * 4) + 1;

        const statuses = ['HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT'];
        const statusWeights = [0.8, 0.1, 0.05, 0.05]; // Weighted probabilities

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

        // If not present, add surat izin for IZIN or SAKIT
        const suratIzin = ['IZIN', 'SAKIT'].includes(statuses[statusIndex])
            ? `surat_izin_${Math.random().toString(36).substring(7)}.pdf`
            : null;

        return {
            kelasProgramId,
            guruId,
            payrollId,
            tanggal,
            jamMasuk,
            jamKeluar,
            sks,
            suratIzin,
            statusKehadiran: statuses[statusIndex]
        };
    }
}

module.exports = AbsensiGuruFactory; 