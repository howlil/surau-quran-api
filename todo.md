- template ketika user register kirim kan admin surau  
- reminder pemabayran spp lewat wa dan email
- pembayaran spp lewat wa langsung ada link paymentnya sekalian tiap tgl 25(lamakan durasinya 1x 48 jam) , kalau masih velum bayar kirimkan ulang lagi



todo
- registes private
- add user ke kelas private
- do some test for whatsapp api


endpoint : /api/v2/pendaftaran
heaader : {
    multiform/data
}

req :{
    siswa : [
        {
            namaMurid        String
            namaPanggilan    String
            tanggalLahir     String
            jenisKelamin     Gender
            alamat           String
            strataPendidikan enum
            kelasSekolah     String
            email            String
            namaSekolah      String
            namaOrangTua     String
            namaPenjemput    String
            noWhatsapp       String
            biayaPendaftaran decimal 

        },
    ],
    kartuKeluarga : string ?
    hubunganKeluarga : string ?
    isFamily : boolean 
    programId
    kodeVoucher : string ?
    TotalBiaya : decimal


}

res : {
    success : true 
    message : "pendaftaran berhasil dilakukan, lakukan pembayaran"
    "data" : {
        "invoiceUrl" : "string"
    }
}



        {
            "programId": "6db074a2-943c-48fd-a965-6e857363413f",
            "namaProgram": "Private Bersaudara",
            "deskripsi": "Private Bersaudara - Program Private",
            "cover": null
        },
        {
            "programId": "fb5150bc-f482-4e5a-903e-78e57854abab",
            "namaProgram": "Private Mandiri",
            "deskripsi": "Private Mandiri - Program Private",
            "cover": null
        },
        {
            "programId": "c1047383-e013-40f4-b45e-e1400b776ae7",
            "namaProgram": "Private Sharing",
            "deskripsi": "Private Sharing - Program Private",
            "cover": null
        },