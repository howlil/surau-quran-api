-- CreateTable
CREATE TABLE `KelasPengganti` (
    `id` VARCHAR(191) NOT NULL,
    `kelasProgramId` VARCHAR(191) NOT NULL,
    `siswaId` VARCHAR(191) NOT NULL,
    `isTemp` BOOLEAN NOT NULL DEFAULT true,
    `tanggal` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `KelasPengganti` ADD CONSTRAINT `KelasPengganti_kelasProgramId_fkey` FOREIGN KEY (`kelasProgramId`) REFERENCES `KelasProgram`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KelasPengganti` ADD CONSTRAINT `KelasPengganti_siswaId_fkey` FOREIGN KEY (`siswaId`) REFERENCES `Siswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
