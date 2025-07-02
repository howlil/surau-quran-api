class AbsensiGuruFactory {
    static create(kelasProgramId, guruId, payrollId = null, index = 0) {
        // Generate date in the last 3 months
        const currentDate = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(currentDate.getMonth() - 3);

        const randomTimeOffset = Math.random() * (currentDate.getTime() - threeMonthsAgo.getTime());
        const randomDate = new Date(threeMonthsAgo.getTime() + randomTimeOffset - (index * 24 * 60 * 60 * 1000));

        // Format tanggal menggunakan format DD-MM-YYYY sesuai DATE_FORMATS.DEFAULT
        const day = randomDate.getDate().toString().padStart(2, '0');
        const month = (randomDate.getMonth() + 1).toString().padStart(2, '0');
        const year = randomDate.getFullYear();
        const tanggal = `${day}-${month}-${year}`;

        // Random jam masuk between 10:00 and 20:45 as per rules
        const startHour = Math.floor(Math.random() * 11) + 10; // 10:00 to 20:00
        const startMinute = Math.floor(Math.random() * 46); // 0 to 45 minutes
        const jamMasuk = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;

        // SKS (1 SKS = 1.5 hours)
        const sks = Math.floor(Math.random() * 3) + 1; // 1-3 SKS

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

        const statusKehadiran = statuses[statusIndex];

        // Calculate penalties based on rules
        const terlambat = Math.random() < 0.1; // 10% chance of being late
        const menitTerlambat = terlambat ? Math.floor(Math.random() * 30) + 1 : null;
        const potonganTerlambat = terlambat ? 10000 : null; // Rp 10,000 for late

        // Penalties for absence
        const potonganTanpaKabar = statusKehadiran === 'TIDAK_HADIR' ? 20000 : null; // Rp 20,000 for absence without notice

        // If not present, add surat izin for IZIN or SAKIT
        const suratIzin = ['IZIN', 'SAKIT'].includes(statusKehadiran)
            ? `surat_izin_${Math.random().toString(36).substring(7)}.pdf`
            : null;

        const potonganTanpaSuratIzin = (statusKehadiran === 'IZIN' || statusKehadiran === 'SAKIT') && !suratIzin ? 10000 : null;

        // Incentive for attendance with minimum 2 SKS
        const insentifKehadiran = statusKehadiran === 'HADIR' && sks >= 2 ? 10000 : null;

        return {
            kelasProgramId,
            guruId,
            payrollId,
            tanggal,
            jamMasuk,
            sks,
            suratIzin,
            statusKehadiran,
            terlambat,
            menitTerlambat,
            potonganTerlambat,
            potonganTanpaKabar,
            potonganTanpaSuratIzin,
            insentifKehadiran
        };
    }
}

module.exports = AbsensiGuruFactory; 