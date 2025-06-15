-- AlterTable
ALTER TABLE `pembayaran` MODIFY `statusPembayaran` ENUM('UNPAID', 'PENDING', 'PAID', 'LUNAS', 'SETTLED', 'EXPIRED', 'INACTIVE', 'ACTIVE', 'STOPPED') NOT NULL;

-- CreateTable
CREATE TABLE `PayrollBatchDisbursement` (
    `id` VARCHAR(191) NOT NULL,
    `xenditBatchId` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `totalCount` INTEGER NOT NULL,
    `payrollIds` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PayrollBatchDisbursement_xenditBatchId_key`(`xenditBatchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
