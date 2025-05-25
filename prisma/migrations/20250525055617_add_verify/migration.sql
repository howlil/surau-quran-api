-- DropForeignKey
ALTER TABLE `programsiswa` DROP FOREIGN KEY `ProgramSiswa_kelasProgramId_fkey`;

-- DropIndex
DROP INDEX `ProgramSiswa_kelasProgramId_fkey` ON `programsiswa`;

-- AlterTable
ALTER TABLE `programsiswa` ADD COLUMN `isVerified` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `kelasProgramId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `ProgramSiswa` ADD CONSTRAINT `ProgramSiswa_kelasProgramId_fkey` FOREIGN KEY (`kelasProgramId`) REFERENCES `KelasProgram`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
