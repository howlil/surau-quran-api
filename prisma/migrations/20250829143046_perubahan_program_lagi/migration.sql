/*
  Warnings:

  - You are about to drop the column `biayaPendaftaran` on the `pendaftaranprivatetemp` table. All the data in the column will be lost.
  - Added the required column `biayaPendaftaran` to the `SiswaPrivateTemp` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `pendaftaranprivatetemp` DROP COLUMN `biayaPendaftaran`;

-- AlterTable
ALTER TABLE `siswaprivatetemp` ADD COLUMN `biayaPendaftaran` DECIMAL(10, 2) NOT NULL;
