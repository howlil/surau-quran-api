/*
  Warnings:

  - You are about to drop the column `jamId` on the `kelasprogram` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `absensiguru` ADD COLUMN `payrollId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `kelasprogram` DROP COLUMN `jamId`;

-- CreateTable
CREATE TABLE `Voucher` (
    `id` VARCHAR(191) NOT NULL,
    `kodeVoucher` VARCHAR(191) NOT NULL,
    `tipe` ENUM('PERSENTASE', 'NOMINAL') NOT NULL,
    `nominal` DECIMAL(10, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `jumlahPenggunaan` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Voucher_kodeVoucher_key`(`kodeVoucher`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pendaftaran` (
    `id` VARCHAR(191) NOT NULL,
    `siswaId` VARCHAR(191) NOT NULL,
    `programSiswaId` VARCHAR(191) NOT NULL,
    `pembayaranId` VARCHAR(191) NULL,
    `biayaPendaftaran` DECIMAL(10, 2) NOT NULL,
    `tanggalDaftar` DATE NOT NULL,
    `voucherId` VARCHAR(191) NULL,
    `diskon` DECIMAL(10, 2) NOT NULL,
    `totalBiaya` DECIMAL(10, 2) NOT NULL,
    `statusVerifikasi` ENUM('MENUNGGU', 'DIVERIFIKASI') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Pendaftaran_pembayaranId_key`(`pembayaranId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PeriodeSpp` (
    `id` VARCHAR(191) NOT NULL,
    `programSiswaId` VARCHAR(191) NOT NULL,
    `bulan` VARCHAR(191) NOT NULL,
    `tahun` INTEGER NOT NULL,
    `tanggalTagihan` DATE NOT NULL,
    `tanggalJatuhTempo` DATE NOT NULL,
    `jumlahTagihan` DECIMAL(10, 2) NOT NULL,
    `voucherId` VARCHAR(191) NULL,
    `diskon` DECIMAL(10, 2) NOT NULL,
    `totalTagihan` DECIMAL(10, 2) NOT NULL,
    `statusPembayaran` ENUM('PENDING', 'MENUNGGU_PEMBAYARAN', 'LUNAS', 'BELUM_BAYAR', 'KADALUARSA', 'DIBATALKAN') NOT NULL,
    `pembayaranId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PeriodeSpp_pembayaranId_key`(`pembayaranId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pembayaran` (
    `id` VARCHAR(191) NOT NULL,
    `tipePembayaran` ENUM('PENDAFTARAN', 'SPP') NOT NULL,
    `metodePembayaran` ENUM('TUNAI', 'VIRTUAL_ACCOUNT', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QRIS') NOT NULL,
    `jumlahTagihan` DECIMAL(10, 2) NOT NULL,
    `statusPembayaran` ENUM('PENDING', 'MENUNGGU_PEMBAYARAN', 'LUNAS', 'BELUM_BAYAR', 'KADALUARSA', 'DIBATALKAN') NOT NULL,
    `tanggalPembayaran` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `XenditPayment` (
    `id` VARCHAR(191) NOT NULL,
    `pembayaranId` VARCHAR(191) NOT NULL,
    `xenditInvoiceId` VARCHAR(191) NOT NULL,
    `xenditExternalId` VARCHAR(191) NOT NULL,
    `xenditPaymentUrl` VARCHAR(191) NOT NULL,
    `xenditPaymentChannel` VARCHAR(191) NOT NULL,
    `xenditExpireDate` DATETIME(3) NOT NULL,
    `xenditPaidAt` DATETIME(3) NULL,
    `xenditStatus` ENUM('PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'FAILED') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `XenditPayment_pembayaranId_key`(`pembayaranId`),
    UNIQUE INDEX `XenditPayment_xenditInvoiceId_key`(`xenditInvoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `XenditCallbackInvoice` (
    `id` VARCHAR(191) NOT NULL,
    `xenditPaymentId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `rawResponse` JSON NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'FAILED') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `XenditCallbackDisbursement` (
    `id` VARCHAR(191) NOT NULL,
    `xenditDisbursementId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `rawResponse` JSON NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payroll` (
    `id` VARCHAR(191) NOT NULL,
    `guruId` VARCHAR(191) NOT NULL,
    `periode` VARCHAR(191) NOT NULL,
    `bulan` VARCHAR(191) NOT NULL,
    `tahun` INTEGER NOT NULL,
    `gajiPokok` DECIMAL(10, 2) NOT NULL,
    `insentif` DECIMAL(10, 2) NOT NULL,
    `potongan` DECIMAL(10, 2) NOT NULL,
    `totalGaji` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('DRAFT', 'DIPROSES', 'SELESAI', 'GAGAL') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayrollDisbursement` (
    `id` VARCHAR(191) NOT NULL,
    `payrollId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `tanggalProses` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PayrollDisbursement_payrollId_key`(`payrollId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `XenditDisbursement` (
    `id` VARCHAR(191) NOT NULL,
    `payrollDisbursementId` VARCHAR(191) NOT NULL,
    `xenditDisbursementId` VARCHAR(191) NOT NULL,
    `xenditExternalId` VARCHAR(191) NOT NULL,
    `xenditAmount` DECIMAL(10, 2) NOT NULL,
    `xenditStatus` ENUM('PENDING', 'COMPLETED', 'FAILED') NOT NULL,
    `xenditCreatedAt` DATETIME(3) NOT NULL,
    `xenditUpdatedAt` DATETIME(3) NULL,
    `rawResponse` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `XenditDisbursement_payrollDisbursementId_key`(`payrollDisbursementId`),
    UNIQUE INDEX `XenditDisbursement_xenditDisbursementId_key`(`xenditDisbursementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AbsensiGuru` ADD CONSTRAINT `AbsensiGuru_payrollId_fkey` FOREIGN KEY (`payrollId`) REFERENCES `Payroll`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pendaftaran` ADD CONSTRAINT `Pendaftaran_siswaId_fkey` FOREIGN KEY (`siswaId`) REFERENCES `Siswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pendaftaran` ADD CONSTRAINT `Pendaftaran_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `Voucher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pendaftaran` ADD CONSTRAINT `Pendaftaran_programSiswaId_fkey` FOREIGN KEY (`programSiswaId`) REFERENCES `ProgramSiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pendaftaran` ADD CONSTRAINT `Pendaftaran_pembayaranId_fkey` FOREIGN KEY (`pembayaranId`) REFERENCES `Pembayaran`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeriodeSpp` ADD CONSTRAINT `PeriodeSpp_programSiswaId_fkey` FOREIGN KEY (`programSiswaId`) REFERENCES `ProgramSiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeriodeSpp` ADD CONSTRAINT `PeriodeSpp_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `Voucher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeriodeSpp` ADD CONSTRAINT `PeriodeSpp_pembayaranId_fkey` FOREIGN KEY (`pembayaranId`) REFERENCES `Pembayaran`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `XenditPayment` ADD CONSTRAINT `XenditPayment_pembayaranId_fkey` FOREIGN KEY (`pembayaranId`) REFERENCES `Pembayaran`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `XenditCallbackInvoice` ADD CONSTRAINT `XenditCallbackInvoice_xenditPaymentId_fkey` FOREIGN KEY (`xenditPaymentId`) REFERENCES `XenditPayment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `XenditCallbackDisbursement` ADD CONSTRAINT `XenditCallbackDisbursement_xenditDisbursementId_fkey` FOREIGN KEY (`xenditDisbursementId`) REFERENCES `XenditDisbursement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payroll` ADD CONSTRAINT `Payroll_guruId_fkey` FOREIGN KEY (`guruId`) REFERENCES `Guru`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollDisbursement` ADD CONSTRAINT `PayrollDisbursement_payrollId_fkey` FOREIGN KEY (`payrollId`) REFERENCES `Payroll`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `XenditDisbursement` ADD CONSTRAINT `XenditDisbursement_payrollDisbursementId_fkey` FOREIGN KEY (`payrollDisbursementId`) REFERENCES `PayrollDisbursement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
