/*
  Warnings:

  - You are about to drop the column `insentifKehadiran` on the `absensiguru` table. All the data in the column will be lost.
  - You are about to drop the column `potonganTanpaKabar` on the `absensiguru` table. All the data in the column will be lost.
  - You are about to drop the column `potonganTanpaSuratIzin` on the `absensiguru` table. All the data in the column will be lost.
  - You are about to drop the column `potonganTerlambat` on the `absensiguru` table. All the data in the column will be lost.
  - You are about to drop the column `insentif` on the `payroll` table. All the data in the column will be lost.
  - You are about to drop the column `potongan` on the `payroll` table. All the data in the column will be lost.
  - The values [DIPROSES,SELESAI,GAGAL] on the enum `Payroll_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `jumlahTagihan` on the `pembayaran` table. All the data in the column will be lost.
  - You are about to alter the column `metodePembayaran` on the `pembayaran` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(2))` to `VarChar(191)`.
  - The values [UNPAID,PAID,LUNAS,SETTLED,EXPIRED,INACTIVE,ACTIVE,STOPPED] on the enum `Pembayaran_statusPembayaran` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `diskon` on the `pendaftaran` table. All the data in the column will be lost.
  - You are about to drop the column `totalBiaya` on the `pendaftaran` table. All the data in the column will be lost.
  - You are about to drop the column `voucher_id` on the `pendaftaran` table. All the data in the column will be lost.
  - You are about to drop the column `diskon` on the `periodespp` table. All the data in the column will be lost.
  - You are about to drop the column `totalTagihan` on the `periodespp` table. All the data in the column will be lost.
  - You are about to drop the column `voucher_id` on the `periodespp` table. All the data in the column will be lost.
  - You are about to drop the `password_reset_tokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payrollbatchdisbursement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payrolldisbursement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `token` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `xenditdisbursement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `xenditpayment` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[orderId]` on the table `Pembayaran` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[transactionId]` on the table `Pembayaran` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `totalPotongan` to the `Payroll` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalTagihan` to the `Pembayaran` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chanelId` to the `PendaftaranPrivateTemp` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `password_reset_tokens` DROP FOREIGN KEY `password_reset_tokens_userId_fkey`;

-- DropForeignKey
ALTER TABLE `payrolldisbursement` DROP FOREIGN KEY `PayrollDisbursement_payrollId_fkey`;

-- DropForeignKey
ALTER TABLE `pendaftaran` DROP FOREIGN KEY `Pendaftaran_voucher_id_fkey`;

-- DropForeignKey
ALTER TABLE `pendaftaranprivatetemp` DROP FOREIGN KEY `PendaftaranPrivateTemp_siswaPrivateId_fkey`;

-- DropForeignKey
ALTER TABLE `periodespp` DROP FOREIGN KEY `PeriodeSpp_voucher_id_fkey`;

-- DropForeignKey
ALTER TABLE `token` DROP FOREIGN KEY `Token_userId_fkey`;

-- DropForeignKey
ALTER TABLE `xenditdisbursement` DROP FOREIGN KEY `XenditDisbursement_payrollDisbursementId_fkey`;

-- DropForeignKey
ALTER TABLE `xenditpayment` DROP FOREIGN KEY `XenditPayment_pembayaranId_fkey`;

-- DropIndex
DROP INDEX `Pendaftaran_voucher_id_fkey` ON `pendaftaran`;

-- DropIndex
DROP INDEX `PendaftaranPrivateTemp_siswaPrivateId_fkey` ON `pendaftaranprivatetemp`;

-- DropIndex
DROP INDEX `PeriodeSpp_voucher_id_fkey` ON `periodespp`;

-- AlterTable
ALTER TABLE `absensiguru` DROP COLUMN `insentifKehadiran`,
    DROP COLUMN `potonganTanpaKabar`,
    DROP COLUMN `potonganTanpaSuratIzin`,
    DROP COLUMN `potonganTerlambat`;

-- AlterTable
ALTER TABLE `payroll` DROP COLUMN `insentif`,
    DROP COLUMN `potongan`,
    ADD COLUMN `insentifKehadiran` DECIMAL(10, 2) NULL,
    ADD COLUMN `insentifLainya` DECIMAL(10, 2) NULL,
    ADD COLUMN `potonganAbsen` DECIMAL(10, 2) NULL,
    ADD COLUMN `potonganTerlambat` DECIMAL(10, 2) NULL,
    ADD COLUMN `potonganTidakAdaKabar` DECIMAL(10, 2) NULL,
    ADD COLUMN `totalAbsen` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `totalInsentif` DECIMAL(10, 2) NULL,
    ADD COLUMN `totalKehadiran` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `totalPotongan` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `totalTerlambat` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `totalTidakAdaKabar` INTEGER NOT NULL DEFAULT 0,
    MODIFY `status` ENUM('DRAFT', 'PENDING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL;

-- AlterTable
ALTER TABLE `pembayaran` DROP COLUMN `jumlahTagihan`,
    ADD COLUMN `discount` DECIMAL(10, 2) NULL,
    ADD COLUMN `orderId` VARCHAR(191) NULL,
    ADD COLUMN `totalTagihan` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `transactionId` VARCHAR(191) NULL,
    ADD COLUMN `voucherId` VARCHAR(191) NULL,
    MODIFY `metodePembayaran` VARCHAR(191) NULL,
    MODIFY `statusPembayaran` ENUM('PENDING', 'SETTLEMENT', 'DENY', 'CANCEL', 'EXPIRE') NOT NULL;

-- AlterTable
ALTER TABLE `pendaftaran` DROP COLUMN `diskon`,
    DROP COLUMN `totalBiaya`,
    DROP COLUMN `voucher_id`;

-- AlterTable
ALTER TABLE `pendaftaranprivatetemp` ADD COLUMN `chanelId` VARCHAR(191) NOT NULL,
    MODIFY `siswaPrivateId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `pendaftarantemp` ADD COLUMN `chanelId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `periodespp` DROP COLUMN `diskon`,
    DROP COLUMN `totalTagihan`,
    DROP COLUMN `voucher_id`;

-- DropTable
DROP TABLE `password_reset_tokens`;

-- DropTable
DROP TABLE `payrollbatchdisbursement`;

-- DropTable
DROP TABLE `payrolldisbursement`;

-- DropTable
DROP TABLE `token`;

-- DropTable
DROP TABLE `xenditdisbursement`;

-- DropTable
DROP TABLE `xenditpayment`;

-- CreateTable
CREATE TABLE `Chanel` (
    `id` VARCHAR(191) NOT NULL,
    `chanelName` VARCHAR(191) NOT NULL,
    `isOther` BOOLEAN NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Pembayaran_orderId_key` ON `Pembayaran`(`orderId`);

-- CreateIndex
CREATE UNIQUE INDEX `Pembayaran_transactionId_key` ON `Pembayaran`(`transactionId`);

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `Voucher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PendaftaranTemp` ADD CONSTRAINT `PendaftaranTemp_chanelId_fkey` FOREIGN KEY (`chanelId`) REFERENCES `Chanel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PendaftaranPrivateTemp` ADD CONSTRAINT `PendaftaranPrivateTemp_siswaPrivateId_fkey` FOREIGN KEY (`siswaPrivateId`) REFERENCES `SiswaPrivateTemp`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PendaftaranPrivateTemp` ADD CONSTRAINT `PendaftaranPrivateTemp_chanelId_fkey` FOREIGN KEY (`chanelId`) REFERENCES `Chanel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
