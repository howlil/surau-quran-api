/*
  Warnings:

  - You are about to drop the column `tempRegistrationId` on the `xenditpayment` table. All the data in the column will be lost.
  - You are about to drop the `tempregistration` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `tempregistration` DROP FOREIGN KEY `TempRegistration_kelasProgramId_fkey`;

-- DropForeignKey
ALTER TABLE `tempregistration` DROP FOREIGN KEY `TempRegistration_programId_fkey`;

-- DropForeignKey
ALTER TABLE `tempregistration` DROP FOREIGN KEY `TempRegistration_voucherId_fkey`;

-- DropForeignKey
ALTER TABLE `xenditpayment` DROP FOREIGN KEY `XenditPayment_tempRegistrationId_fkey`;

-- DropIndex
DROP INDEX `XenditPayment_tempRegistrationId_fkey` ON `xenditpayment`;

-- AlterTable
ALTER TABLE `xenditpayment` DROP COLUMN `tempRegistrationId`;

-- DropTable
DROP TABLE `tempregistration`;
