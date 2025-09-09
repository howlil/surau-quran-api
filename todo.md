- template ketika user register kirim kan admin surau  
- reminder pemabayran spp lewat wa dan email
- pembayaran spp lewat wa langsung ada link paymentnya sekalian tiap tgl 25(lamakan durasinya 1x 48 jam) , kalau masih velum bayar kirimkan ulang lagi


todo :
1. validasi siswa private gabisa pindah ke grup
2. kalau mau pindah nonaktifkna dulu, daftar lagi
3. kalau siswa grup pengen pindah program , di logic pindah program, program lama statusnya jadi nonaktif




2. atur penghibahan ketua



only siswa group

1. bisa pindah antar group, dengan fitur pindah program
2. bisa pindah ke private, dengan menonaktifkan akun lama, regis ulang akun baru

only siswa private

1. fitur pindah program disable untuk siswa private
2. jika mau pindah, non aktifkan akun lama, dan jika dia ketua, hibahkan ketua ke anggota selanjutnya ketika menonaktifkan akun, dan regis ulang dengan voucher 100%
3. 



proses bisnis 
1. siswa yang ingin prindah program dari grup ke privat atau sebaliknya, bisa menonaktifkan akunya terlebih dahulu, lalu bisa regis lagi dengan akun yang sama, jadi data lama ttp ada di admin, nmun di user gada
2. berrati pas login siswa check tu apakah yg login ini akun yang aktif?





3. kemudian jika siswa private di nonaktifkan akunya, coba cek
    - apa tipe dari private nya , jika sharing dan bersaudara maka
    - cek lagi apakah dia ketuanya? (ketua disini siswa yang tidak memiliki keluargaId)
    - jika dia bukan ketua bisa langsung pindah
    - jika dia ketua
    - get semua anggota termasuk ketua
    - maka secara random mandat ketua akan di berikan ke anggotanya (orang yang memiliki keluargaId yang sama dengan ex ketua)
    - lalu jika sudah ditentukan siapa ketua barunya (orang ini harus di hapus field keluarga Id sebagai penda kalau dia ketua)
    - update keluargaid baru anggota yang lainya