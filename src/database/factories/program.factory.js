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

        // Biaya SPP berdasarkan jenis program (dalam Rupiah)
        const biayaSppOptions = [
            300000, // Tahfidz Regular
            450000, // Tahfidz Intensif  
            250000, // Tahsin Dasar
            300000, // Tahsin Lanjutan
            275000, // Tajwid
            400000, // Qiraah Sab'ah
            200000, // Bahasa Arab Pemula
            250000, // Bahasa Arab Menengah
            350000, // Tafsir Dasar
            350000  // Tadabbur
        ];

        return {
            namaProgram: index < programNames.length ? programNames[index] : `Program ${Math.random().toString(36).substring(7)}`,
            biayaSpp: index < biayaSppOptions.length ? biayaSppOptions[index] : 300000 // Default 300k
        };
    }
}

module.exports = ProgramFactory; 