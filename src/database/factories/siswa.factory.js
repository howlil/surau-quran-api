class SiswaFactory {
    static create() {
        return {
            noWhatsapp: `08${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`,
            namaMurid: `Siswa ${Math.random().toString(36).substring(7)}`,
            namaPanggilan: `Panggilan ${Math.random().toString(36).substring(7)}`,
            tanggalLahir: `${2000 + Math.floor(Math.random() * 20)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
            jenisKelamin: Math.random() > 0.5 ? 'LAKI_LAKI' : 'PEREMPUAN',
            alamat: `Alamat Siswa ${Math.random().toString(36).substring(7)}`,
            strataPendidikan: ['PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM'][Math.floor(Math.random() * 7)],
            kelasSekolah: `${Math.floor(Math.random() * 12) + 1}`,
            namaSekolah: `Sekolah ${Math.random().toString(36).substring(7)}`,
            namaOrangTua: `Orang Tua ${Math.random().toString(36).substring(7)}`,
            namaPenjemput: `Penjemput ${Math.random().toString(36).substring(7)}`,
            isRegistered: Math.random() > 0.5
        };
    }
}

module.exports = SiswaFactory; 