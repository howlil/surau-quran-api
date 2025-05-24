/*
  Warnings:

  - You are about to alter the column `metodePembayaran` on the `pembayaran` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(2))` to `Enum(EnumId(13))`.

*/
-- AlterTable
ALTER TABLE `pembayaran` MODIFY `metodePembayaran` ENUM('VIRTUAL_ACCOUNT', 'CARD', 'OVER_THE_COUNTER', 'DIRECT_DEBIT', 'BANK_TRANSFER', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QR_CODE') NULL;
