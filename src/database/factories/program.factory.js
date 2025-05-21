class ProgramFactory {
    static create(index) {
        const programNames = [
            'Tahfidz Al-Quran Regular',
            'Tahfidz Al-Quran Intensif',
            'Tahsin Al-Quran Dasar',
            'Tahsin Al-Quran Lanjutan',
            'Tajwid Al-Quran',
            'Qiraah Sab\'ah',
            'Bahasa Arab untuk Pemula',
            'Bahasa Arab Menengah',
            'Tafsir Al-Quran Dasar',
            'Tadabbur Al-Quran'
        ];

        return {
            namaProgram: index < programNames.length ? programNames[index] : `Program ${Math.random().toString(36).substring(7)}`
        };
    }
}

module.exports = ProgramFactory; 