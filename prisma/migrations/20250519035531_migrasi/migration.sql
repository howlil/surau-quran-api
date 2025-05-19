-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'SISWA', 'GURU') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Token` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Token_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Siswa` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `noWhatsapp` VARCHAR(191) NULL,
    `namaMurid` VARCHAR(191) NOT NULL,
    `namaPanggilan` VARCHAR(191) NULL,
    `tanggalLahir` VARCHAR(191) NULL,
    `jenisKelamin` ENUM('LAKI_LAKI', 'PEREMPUAN') NOT NULL,
    `alamat` VARCHAR(191) NULL,
    `strataPendidikan` ENUM('PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM') NULL,
    `kelasSekolah` VARCHAR(191) NULL,
    `namaSekolah` VARCHAR(191) NULL,
    `namaOrangTua` VARCHAR(191) NULL,
    `namaPenjemput` VARCHAR(191) NULL,
    `isRegistered` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Siswa_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Admin` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Admin_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Guru` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `nip` VARCHAR(191) NULL,
    `nama` VARCHAR(191) NOT NULL,
    `noWhatsapp` VARCHAR(191) NULL,
    `alamat` VARCHAR(191) NULL,
    `jenisKelamin` ENUM('LAKI_LAKI', 'PEREMPUAN') NULL,
    `fotoProfile` VARCHAR(191) NULL,
    `keahlian` VARCHAR(191) NULL,
    `pendidikanTerakhir` VARCHAR(191) NULL,
    `noRekening` VARCHAR(191) NULL,
    `namaBank` VARCHAR(191) NULL,
    `tarifPerJam` DECIMAL(10, 2) NOT NULL,
    `suratKontrak` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Guru_userId_key`(`userId`),
    UNIQUE INDEX `Guru_nip_key`(`nip`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Kelas` (
    `id` VARCHAR(191) NOT NULL,
    `namaKelas` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Program` (
    `id` VARCHAR(191) NOT NULL,
    `namaProgram` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JamMengajar` (
    `id` VARCHAR(191) NOT NULL,
    `jamMulai` VARCHAR(191) NOT NULL,
    `jamSelesai` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KelasProgram` (
    `id` VARCHAR(191) NOT NULL,
    `kelasId` VARCHAR(191) NULL,
    `programId` VARCHAR(191) NOT NULL,
    `jamMengajarId` VARCHAR(191) NOT NULL,
    `hari` VARCHAR(191) NOT NULL,
    `guruId` VARCHAR(191) NULL,
    `tipeKelas` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProgramSiswa` (
    `id` VARCHAR(191) NOT NULL,
    `siswaId` VARCHAR(191) NOT NULL,
    `programId` VARCHAR(191) NOT NULL,
    `status` ENUM('AKTIF', 'TIDAK_AKTIF', 'CUTI') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JadwalSiswa` (
    `id` VARCHAR(191) NOT NULL,
    `programSiswaId` VARCHAR(191) NOT NULL,
    `kelasProgramId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiwayatStatusSiswa` (
    `id` VARCHAR(191) NOT NULL,
    `programSiswaId` VARCHAR(191) NOT NULL,
    `statusLama` ENUM('AKTIF', 'TIDAK_AKTIF', 'CUTI') NOT NULL,
    `statusBaru` ENUM('AKTIF', 'TIDAK_AKTIF', 'CUTI') NOT NULL,
    `tanggalPerubahan` VARCHAR(191) NOT NULL,
    `keterangan` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AbsensiSiswa` (
    `id` VARCHAR(191) NOT NULL,
    `kelasProgramId` VARCHAR(191) NOT NULL,
    `tanggal` VARCHAR(191) NOT NULL,
    `statusKehadiran` ENUM('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AbsensiGuru` (
    `id` VARCHAR(191) NOT NULL,
    `kelasProgramId` VARCHAR(191) NOT NULL,
    `payrollId` VARCHAR(191) NULL,
    `tanggal` VARCHAR(191) NOT NULL,
    `jamMasuk` VARCHAR(191) NOT NULL,
    `jamKeluar` VARCHAR(191) NOT NULL,
    `sks` INTEGER NOT NULL,
    `suratIzin` VARCHAR(191) NULL,
    `statusKehadiran` ENUM('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
    `tanggalDaftar` VARCHAR(191) NOT NULL,
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
CREATE TABLE `PendaftaranJadwal` (
    `id` VARCHAR(191) NOT NULL,
    `pendaftaranId` VARCHAR(191) NOT NULL,
    `hari` VARCHAR(191) NOT NULL,
    `jamMengajarId` VARCHAR(191) NOT NULL,
    `prioritas` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PeriodeSpp` (
    `id` VARCHAR(191) NOT NULL,
    `programSiswaId` VARCHAR(191) NOT NULL,
    `bulan` VARCHAR(191) NOT NULL,
    `tahun` INTEGER NOT NULL,
    `tanggalTagihan` VARCHAR(191) NOT NULL,
    `tanggalJatuhTempo` VARCHAR(191) NOT NULL,
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
    `tanggalPembayaran` VARCHAR(191) NOT NULL,
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
    `xenditExpireDate` VARCHAR(191) NOT NULL,
    `xenditPaidAt` VARCHAR(191) NULL,
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
    `tanggalProses` VARCHAR(191) NOT NULL,
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
    `xenditCreatedAt` VARCHAR(191) NOT NULL,
    `xenditUpdatedAt` VARCHAR(191) NULL,
    `rawResponse` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `XenditDisbursement_payrollDisbursementId_key`(`payrollDisbursementId`),
    UNIQUE INDEX `XenditDisbursement_xenditDisbursementId_key`(`xenditDisbursementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Token` ADD CONSTRAINT `Token_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Siswa` ADD CONSTRAINT `Siswa_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Admin` ADD CONSTRAINT `Admin_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Guru` ADD CONSTRAINT `Guru_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KelasProgram` ADD CONSTRAINT `KelasProgram_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `Kelas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KelasProgram` ADD CONSTRAINT `KelasProgram_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `Program`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KelasProgram` ADD CONSTRAINT `KelasProgram_jamMengajarId_fkey` FOREIGN KEY (`jamMengajarId`) REFERENCES `JamMengajar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KelasProgram` ADD CONSTRAINT `KelasProgram_guruId_fkey` FOREIGN KEY (`guruId`) REFERENCES `Guru`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProgramSiswa` ADD CONSTRAINT `ProgramSiswa_siswaId_fkey` FOREIGN KEY (`siswaId`) REFERENCES `Siswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProgramSiswa` ADD CONSTRAINT `ProgramSiswa_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `Program`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JadwalSiswa` ADD CONSTRAINT `JadwalSiswa_programSiswaId_fkey` FOREIGN KEY (`programSiswaId`) REFERENCES `ProgramSiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JadwalSiswa` ADD CONSTRAINT `JadwalSiswa_kelasProgramId_fkey` FOREIGN KEY (`kelasProgramId`) REFERENCES `KelasProgram`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiwayatStatusSiswa` ADD CONSTRAINT `RiwayatStatusSiswa_programSiswaId_fkey` FOREIGN KEY (`programSiswaId`) REFERENCES `ProgramSiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbsensiSiswa` ADD CONSTRAINT `AbsensiSiswa_kelasProgramId_fkey` FOREIGN KEY (`kelasProgramId`) REFERENCES `KelasProgram`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbsensiGuru` ADD CONSTRAINT `AbsensiGuru_payrollId_fkey` FOREIGN KEY (`payrollId`) REFERENCES `Payroll`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbsensiGuru` ADD CONSTRAINT `AbsensiGuru_kelasProgramId_fkey` FOREIGN KEY (`kelasProgramId`) REFERENCES `KelasProgram`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pendaftaran` ADD CONSTRAINT `Pendaftaran_siswaId_fkey` FOREIGN KEY (`siswaId`) REFERENCES `Siswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pendaftaran` ADD CONSTRAINT `Pendaftaran_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `Voucher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pendaftaran` ADD CONSTRAINT `Pendaftaran_programSiswaId_fkey` FOREIGN KEY (`programSiswaId`) REFERENCES `ProgramSiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pendaftaran` ADD CONSTRAINT `Pendaftaran_pembayaranId_fkey` FOREIGN KEY (`pembayaranId`) REFERENCES `Pembayaran`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PendaftaranJadwal` ADD CONSTRAINT `PendaftaranJadwal_pendaftaranId_fkey` FOREIGN KEY (`pendaftaranId`) REFERENCES `Pendaftaran`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PendaftaranJadwal` ADD CONSTRAINT `PendaftaranJadwal_jamMengajarId_fkey` FOREIGN KEY (`jamMengajarId`) REFERENCES `JamMengajar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
