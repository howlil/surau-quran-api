/*
  Warnings:

  - Added the required column `metodePembayaran` to the `Finance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `finance` ADD COLUMN `metodePembayaran` ENUM('VIRTUAL_ACCOUNT', 'TUNAI', 'CARD', 'OVER_THE_COUNTER', 'DIRECT_DEBIT', 'BANK_TRANSFER', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QR_CODE') NOT NULL;

-- AlterTable
ALTER TABLE `pembayaran` ADD COLUMN `evidence` VARCHAR(191) NULL;
