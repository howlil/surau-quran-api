/*
  Warnings:

  - You are about to alter the column `namaKelas` on the `kelas` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(0))` to `VarChar(191)`.
  - You are about to alter the column `hari` on the `kelasprogram` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(10))` to `VarChar(191)`.
  - You are about to alter the column `tipeKelas` on the `kelasprogram` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(16))` to `VarChar(191)`.
  - You are about to alter the column `namaProgram` on the `program` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(2))` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `kelas` MODIFY `namaKelas` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `kelasprogram` MODIFY `hari` VARCHAR(191) NOT NULL,
    MODIFY `tipeKelas` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `program` MODIFY `namaProgram` VARCHAR(191) NOT NULL;
