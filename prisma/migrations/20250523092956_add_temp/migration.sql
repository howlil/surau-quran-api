-- CreateTable
CREATE TABLE `PendaftaranTemp` (
    `id` VARCHAR(191) NOT NULL,
    `namaMurid` VARCHAR(191) NOT NULL,
    `namaPanggilan` VARCHAR(191) NULL,
    `tanggalLahir` VARCHAR(191) NULL,
    `jenisKelamin` ENUM('LAKI_LAKI', 'PEREMPUAN') NOT NULL,
    `alamat` VARCHAR(191) NULL,
    `strataPendidikan` ENUM('PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM') NULL,
    `kelasSekolah` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `namaSekolah` VARCHAR(191) NULL,
    `namaOrangTua` VARCHAR(191) NOT NULL,
    `namaPenjemput` VARCHAR(191) NULL,
    `noWhatsapp` VARCHAR(191) NULL,
    `programId` VARCHAR(191) NOT NULL,
    `jadwalJson` TEXT NOT NULL,
    `kodeVoucher` VARCHAR(191) NULL,
    `biayaPendaftaran` DECIMAL(10, 2) NOT NULL,
    `diskon` DECIMAL(10, 2) NOT NULL,
    `totalBiaya` DECIMAL(10, 2) NOT NULL,
    `pembayaranId` VARCHAR(191) NOT NULL,
    `voucherId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PendaftaranTemp_pembayaranId_key`(`pembayaranId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
