class RiwayatStatusSiswaFactory {
    static create(programSiswaId, statusBaru, index = 0) {
        const statuses = ['AKTIF', 'TIDAK_AKTIF', 'CUTI'];
        // Ensure status lama is different from status baru
        let statusLama;
        do {
            statusLama = statuses[Math.floor(Math.random() * statuses.length)];
        } while (statusLama === statusBaru);

        // Random date in the last 6 months
        const currentDate = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(currentDate.getMonth() - 6);

        const randomDate = new Date(
            sixMonthsAgo.getTime() +
            Math.random() * (currentDate.getTime() - sixMonthsAgo.getTime()) -
            (index * 15 * 24 * 60 * 60 * 1000) // Stagger dates by roughly 15 days
        );

        const tanggalPerubahan = randomDate.toISOString().split('T')[0];

        const keteranganOptions = [
            'Permintaan siswa',
            'Keputusan manajemen',
            'Keterlambatan pembayaran',
            'Perubahan jadwal',
            'Perubahan program',
            'Pencapaian target hafalan',
            'Izin orang tua',
            'Masalah kesehatan',
            'Prestasi akademik',
            'Alasan pribadi'
        ];

        const keterangan = keteranganOptions[Math.floor(Math.random() * keteranganOptions.length)];

        return {
            programSiswaId,
            statusLama,
            statusBaru,
            tanggalPerubahan,
            keterangan
        };
    }
}

module.exports = RiwayatStatusSiswaFactory; 