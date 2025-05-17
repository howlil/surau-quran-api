/*
  Warnings:

  - The values [GROUP] on the enum `Kelas_namaKelas` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `absensiguru` MODIFY `tanggal` VARCHAR(191) NOT NULL,
    MODIFY `jamMasuk` VARCHAR(191) NOT NULL,
    MODIFY `jamKeluar` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `absensisiswa` MODIFY `tanggal` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `jammengajar` MODIFY `jamMulai` VARCHAR(191) NOT NULL,
    MODIFY `jamSelesai` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `kelas` MODIFY `namaKelas` ENUM('MAKKAH', 'MADINAH', 'ALAQSA', 'PUSTAKA', 'NABAWI', 'SHAFA', 'MARWAH', 'PRIVATE') NOT NULL;

-- AlterTable
ALTER TABLE `payrolldisbursement` MODIFY `tanggalProses` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `pembayaran` MODIFY `tanggalPembayaran` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `pendaftaran` MODIFY `tanggalDaftar` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `periodespp` MODIFY `tanggalTagihan` VARCHAR(191) NOT NULL,
    MODIFY `tanggalJatuhTempo` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `riwayatstatussiswa` MODIFY `tanggalPerubahan` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `siswa` MODIFY `tanggalLahir` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `xenditdisbursement` MODIFY `xenditCreatedAt` VARCHAR(191) NOT NULL,
    MODIFY `xenditUpdatedAt` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `xenditpayment` MODIFY `xenditExpireDate` VARCHAR(191) NOT NULL,
    MODIFY `xenditPaidAt` VARCHAR(191) NULL;
