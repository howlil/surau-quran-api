/*
  Warnings:

  - You are about to drop the column `tipeKelas` on the `kelasprogram` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `kelasprogram` DROP COLUMN `tipeKelas`;

-- AlterTable
ALTER TABLE `program` ADD COLUMN `tipeProgram` ENUM('GROUP', 'PRIVATE') NOT NULL DEFAULT 'GROUP';

-- AlterTable
ALTER TABLE `siswa` ADD COLUMN `hubunganKeluarga` VARCHAR(191) NULL,
    ADD COLUMN `isFamily` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `kartuKeluarga` VARCHAR(191) NULL,
    ADD COLUMN `keluargaId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN', 'SISWA', 'GURU') NOT NULL;

-- CreateTable
CREATE TABLE `PendaftaranPrivateTemp` (
    `id` VARCHAR(191) NOT NULL,
    `siswaPrivateId` VARCHAR(191) NOT NULL,
    `isFamily` BOOLEAN NOT NULL DEFAULT false,
    `hubunganKeluarga` VARCHAR(191) NULL,
    `kartuKeluarga` VARCHAR(191) NULL,
    `kodeVoucher` VARCHAR(191) NULL,
    `diskon` DECIMAL(10, 2) NULL,
    `totalBiaya` DECIMAL(10, 2) NOT NULL,
    `biayaPendaftaran` DECIMAL(10, 2) NOT NULL,
    `programId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiswaPrivateTemp` (
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

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PendaftaranPrivateTemp` ADD CONSTRAINT `PendaftaranPrivateTemp_siswaPrivateId_fkey` FOREIGN KEY (`siswaPrivateId`) REFERENCES `SiswaPrivateTemp`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
