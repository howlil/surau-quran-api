/*
  Warnings:

  - The values [SUBTITUTE] on the enum `KelasProgram_tipeKelas` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `sanksiguru` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `kelasProgramId` to the `AbsensiGuru` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `sanksiguru` DROP FOREIGN KEY `SanksiGuru_absensiGuruId_fkey`;

-- DropForeignKey
ALTER TABLE `sanksiguru` DROP FOREIGN KEY `SanksiGuru_guruId_fkey`;

-- DropForeignKey
ALTER TABLE `sanksiguru` DROP FOREIGN KEY `SanksiGuru_payrollId_fkey`;

-- AlterTable
ALTER TABLE `absensiguru` ADD COLUMN `insentifKehadiran` DECIMAL(10, 2) NULL,
    ADD COLUMN `kelasProgramId` VARCHAR(191) NOT NULL,
    ADD COLUMN `potonganTanpaKabar` DECIMAL(10, 2) NULL,
    ADD COLUMN `potonganTanpaSuratIzin` DECIMAL(10, 2) NULL,
    ADD COLUMN `potonganTerlambat` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `kelasprogram` MODIFY `tipeKelas` ENUM('GROUP', 'PRIVATE', 'SUBSTITUTE', 'ONLINE') NOT NULL DEFAULT 'GROUP';

-- DropTable
DROP TABLE `sanksiguru`;

-- AddForeignKey
ALTER TABLE `AbsensiGuru` ADD CONSTRAINT `AbsensiGuru_kelasProgramId_fkey` FOREIGN KEY (`kelasProgramId`) REFERENCES `KelasProgram`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
