/*
  Warnings:

  - You are about to drop the column `voucher_id` on the `pendaftaran` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `pendaftaran` DROP FOREIGN KEY `Pendaftaran_voucher_id_fkey`;

-- DropIndex
DROP INDEX `Pendaftaran_voucher_id_fkey` ON `pendaftaran`;

-- AlterTable
ALTER TABLE `pendaftaran` DROP COLUMN `voucher_id`,
    ADD COLUMN `kodeVoucher` VARCHAR(191) NULL;
