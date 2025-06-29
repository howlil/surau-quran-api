class PendaftaranTempFactory {
    static create(programId, pembayaranId, voucherId = null) {
        // Generate random student data
        const namaMurid = `Siswa ${Math.random().toString(36).substring(7)}`;
        const namaPanggilan = `Panggilan ${Math.random().toString(36).substring(7)}`;

        // Random birth date between 2000-2020
        const year = 2000 + Math.floor(Math.random() * 20);
        const month = Math.floor(Math.random() * 12) + 1;
        const day = Math.floor(Math.random() * 28) + 1;
        const tanggalLahir = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const jenisKelamin = Math.random() > 0.5 ? 'LAKI_LAKI' : 'PEREMPUAN';
        const alamat = `Alamat ${Math.random().toString(36).substring(7)}`;

        const strataPendidikan = ['PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM'][Math.floor(Math.random() * 7)];
        const kelasSekolah = `${Math.floor(Math.random() * 12) + 1}`;

        const email = `temp_${Math.random().toString(36).substring(7)}@example.com`;
        const namaSekolah = `Sekolah ${Math.random().toString(36).substring(7)}`;
        const namaOrangTua = `Orang Tua ${Math.random().toString(36).substring(7)}`;
        const namaPenjemput = `Penjemput ${Math.random().toString(36).substring(7)}`;
        const noWhatsapp = `08${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`;

        // Calculate fees
        const biayaPendaftaran = Math.floor(Math.random() * 300000) + 200000; // 200k-500k
        const diskon = voucherId ? Math.floor(biayaPendaftaran * 0.2) : 0; // 20% discount if voucher
        const totalBiaya = biayaPendaftaran - diskon;

        const kodeVoucher = voucherId ? `VOUCHER${Math.floor(Math.random() * 1000)}` : null;

        return {
            namaMurid,
            namaPanggilan,
            tanggalLahir,
            jenisKelamin,
            alamat,
            strataPendidikan,
            kelasSekolah,
            email,
            namaSekolah,
            namaOrangTua,
            namaPenjemput,
            noWhatsapp,
            programId,
            kodeVoucher,
            biayaPendaftaran,
            diskon,
            totalBiaya,
            pembayaranId,
            voucherId
        };
    }

    static createWithSpecificEmail(programId, pembayaranId, email, voucherId = null) {
        const data = this.create(programId, pembayaranId, voucherId);
        data.email = email;
        return data;
    }

    static createWithMinimalData(programId, pembayaranId) {
        const namaMurid = `Siswa Minimal ${Math.random().toString(36).substring(7)}`;
        const jenisKelamin = Math.random() > 0.5 ? 'LAKI_LAKI' : 'PEREMPUAN';
        const email = `minimal_${Math.random().toString(36).substring(7)}@example.com`;
        const namaOrangTua = `Orang Tua ${Math.random().toString(36).substring(7)}`;

        const biayaPendaftaran = 300000;
        const diskon = 0;
        const totalBiaya = biayaPendaftaran;

        return {
            namaMurid,
            namaPanggilan: null,
            tanggalLahir: null,
            jenisKelamin,
            alamat: null,
            strataPendidikan: null,
            kelasSekolah: null,
            email,
            namaSekolah: null,
            namaOrangTua,
            namaPenjemput: null,
            noWhatsapp: null,
            programId,
            kodeVoucher: null,
            biayaPendaftaran,
            diskon,
            totalBiaya,
            pembayaranId,
            voucherId: null
        };
    }
}

module.exports = PendaftaranTempFactory; 