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

        // Sample IP addresses for Hikvision cameras
        const sampleIpAddresses = [
            '192.168.1.100',
            '192.168.1.101',
            '192.168.1.102',
            '192.168.1.103',
            '192.168.1.104',
            '192.168.1.105',
            '192.168.1.106',
            '192.168.1.107',
            '192.168.1.108',
            '192.168.1.109'
        ];

        return {
            namaKelas: index < kelasNames.length ? kelasNames[index] : `Kelas ${Math.random().toString(36).substring(7)}`,
            ipAddressHikvision: index < sampleIpAddresses.length ? sampleIpAddresses[index] : `192.168.1.${100 + index}`
        };
    }
}

module.exports = KelasFactory; 