/*
  Warnings:

  - You are about to drop the `kelaspengganti` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `kelaspengganti` DROP FOREIGN KEY `KelasPengganti_kelasProgramId_fkey`;

-- DropForeignKey
ALTER TABLE `kelaspengganti` DROP FOREIGN KEY `KelasPengganti_siswaId_fkey`;

-- DropTable
DROP TABLE `kelaspengganti`;

-- CreateTable
CREATE TABLE `kelas_pengganti` (
    `id` VARCHAR(191) NOT NULL,
    `kelasProgramId` VARCHAR(191) NOT NULL,
    `siswaId` VARCHAR(191) NOT NULL,
    `isTemp` BOOLEAN NOT NULL DEFAULT true,
    `tanggal` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `kelas_pengganti_kelasProgramId_siswaId_tanggal_key`(`kelasProgramId`, `siswaId`, `tanggal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `kelas_pengganti` ADD CONSTRAINT `kelas_pengganti_kelasProgramId_fkey` FOREIGN KEY (`kelasProgramId`) REFERENCES `KelasProgram`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kelas_pengganti` ADD CONSTRAINT `kelas_pengganti_siswaId_fkey` FOREIGN KEY (`siswaId`) REFERENCES `Siswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
