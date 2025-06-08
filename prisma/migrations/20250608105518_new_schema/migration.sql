/*
  Warnings:

  - You are about to drop the column `keterangan` on the `riwayatstatussiswa` table. All the data in the column will be lost.
  - Added the required column `namaVoucher` to the `Voucher` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `riwayatstatussiswa` DROP COLUMN `keterangan`;

-- AlterTable
ALTER TABLE `voucher` ADD COLUMN `namaVoucher` VARCHAR(191) NOT NULL;
