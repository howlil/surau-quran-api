/*
  Warnings:

  - You are about to drop the column `isVerified` on the `programsiswa` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nis]` on the table `Siswa` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `programsiswa` DROP COLUMN `isVerified`;

-- CreateIndex
CREATE UNIQUE INDEX `Siswa_nis_key` ON `Siswa`(`nis`);
