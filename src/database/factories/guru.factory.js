class GuruFactory {
    static create() {
        // Generate a random date between 1980 and 2000 for teachers
        const startDate = new Date(1980, 0, 1);
        const endDate = new Date(2000, 11, 31);
        const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        const tanggalLahir = randomDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        return {
            nip: `NIP${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
            nama: `Guru ${Math.random().toString(36).substring(7)}`,
            noWhatsapp: `08${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`,
            alamat: `Alamat Guru ${Math.random().toString(36).substring(7)}`,
            jenisKelamin: Math.random() > 0.5 ? 'LAKI_LAKI' : 'PEREMPUAN',
            tanggalLahir,
            keahlian: ['Tahfidz', 'Tajwid', 'Qiraat'][Math.floor(Math.random() * 3)],
            pendidikanTerakhir: ['S1', 'S2', 'S3'][Math.floor(Math.random() * 3)],
            noRekening: Math.floor(Math.random() * 1000000000000).toString(),
            namaBank: ['BCA', 'Mandiri', 'BNI'][Math.floor(Math.random() * 3)],
            tarifPerJam: Math.floor(Math.random() * 100000) + 50000
        };
    }
}

module.exports = GuruFactory; 