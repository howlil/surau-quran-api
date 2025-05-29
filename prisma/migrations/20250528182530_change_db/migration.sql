/*
  Warnings:

  - You are about to drop the column `kelasProgramId` on the `absensiguru` table. All the data in the column will be lost.
  - You are about to drop the column `tarifPerJam` on the `guru` table. All the data in the column will be lost.
  - Made the column `tipeKelas` on table `kelasprogram` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `absensiguru` DROP FOREIGN KEY `AbsensiGuru_kelasProgramId_fkey`;

-- DropIndex
DROP INDEX `AbsensiGuru_kelasProgramId_fkey` ON `absensiguru`;

-- AlterTable
ALTER TABLE `absensiguru` DROP COLUMN `kelasProgramId`,
    ADD COLUMN `menitTerlambat` INTEGER NULL,
    ADD COLUMN `terlambat` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `guru` DROP COLUMN `tarifPerJam`;

-- AlterTable
ALTER TABLE `kelasprogram` MODIFY `tipeKelas` ENUM('GROUP', 'PRIVATE', 'SUBTITUTE', 'ONLINE') NOT NULL DEFAULT 'GROUP';

-- CreateTable
CREATE TABLE `SanksiGuru` (
    `id` VARCHAR(191) NOT NULL,
    `guruId` VARCHAR(191) NOT NULL,
    `absensiGuruId` VARCHAR(191) NULL,
    `tipeSanksi` ENUM('KETERLAMBATAN', 'ABSEN_TANPA_KABAR', 'IZIN_TANPA_SURAT_IZIN') NOT NULL,
    `tanggal` VARCHAR(191) NOT NULL,
    `nominal` DECIMAL(10, 2) NOT NULL,
    `deskripsi` VARCHAR(191) NULL,
    `payrollId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SanksiGuru` ADD CONSTRAINT `SanksiGuru_guruId_fkey` FOREIGN KEY (`guruId`) REFERENCES `Guru`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SanksiGuru` ADD CONSTRAINT `SanksiGuru_absensiGuruId_fkey` FOREIGN KEY (`absensiGuruId`) REFERENCES `AbsensiGuru`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SanksiGuru` ADD CONSTRAINT `SanksiGuru_payrollId_fkey` FOREIGN KEY (`payrollId`) REFERENCES `Payroll`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
