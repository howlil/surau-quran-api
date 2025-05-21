/*
  Warnings:

  - You are about to drop the column `statusVerifikasi` on the `pendaftaran` table. All the data in the column will be lost.
  - You are about to drop the column `statusPembayaran` on the `periodespp` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `pendaftaran` DROP COLUMN `statusVerifikasi`;

-- AlterTable
ALTER TABLE `periodespp` DROP COLUMN `statusPembayaran`;

-- AlterTable
ALTER TABLE `siswa` ADD COLUMN `nis` VARCHAR(191) NULL;
