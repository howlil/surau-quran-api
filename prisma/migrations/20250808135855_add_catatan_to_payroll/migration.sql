/*
  Warnings:

  - You are about to drop the column `jumlahPenggunaan` on the `voucher` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `absensiguru` MODIFY `statusKehadiran` ENUM('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT', 'BELUM_ABSEN', 'TERLAMBAT') NOT NULL;

-- AlterTable
ALTER TABLE `absensisiswa` MODIFY `statusKehadiran` ENUM('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT', 'BELUM_ABSEN', 'TERLAMBAT') NOT NULL;

-- AlterTable
ALTER TABLE `payroll` ADD COLUMN `catatan` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `voucher` DROP COLUMN `jumlahPenggunaan`;
