class KelasFactory {
    static create(index) {
        const kelasNames = [
            'Tahfidz Pemula',
            'Tahfidz Lanjutan',
            'Tahsin Dasar',
            'Tahsin Menengah',
            'Tajwid Dasar',
            'Tajwid Lanjutan',
            'Qiraah Sab\'ah',
            'Bahasa Arab Pemula',
            'Bahasa Arab Lanjutan',
            'Tafsir Al-Quran'
        ];

        return {
            namaKelas: index < kelasNames.length ? kelasNames[index] : `Kelas ${Math.random().toString(36).substring(7)}`
        };
    }
}

module.exports = KelasFactory; 