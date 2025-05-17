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
    `tanggalLahir` DATE NULL,
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
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Kelas` (
    `id` VARCHAR(191) NOT NULL,
    `namaKelas` ENUM('GROUP', 'PRIVATE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Program` (
    `id` VARCHAR(191) NOT NULL,
    `namaProgram` ENUM('PRE_BTA', 'BTA_LVL_1', 'BTA_LVL_2', 'TAHSIN', 'TAHFIDZ', 'PRIVATE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JamMengajar` (
    `id` VARCHAR(191) NOT NULL,
    `jamMulai` TIME NOT NULL,
    `jamSelesai` TIME NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KelasProgram` (
    `id` VARCHAR(191) NOT NULL,
    `kelasId` VARCHAR(191) NOT NULL,
    `programId` VARCHAR(191) NOT NULL,
    `jamMengajarId` VARCHAR(191) NOT NULL,
    `hari` ENUM('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU') NOT NULL,
    `jamId` VARCHAR(191) NOT NULL,
    `guruId` VARCHAR(191) NOT NULL,
    `tipeKelas` ENUM('GROUP', 'PRIVATE') NOT NULL,
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
    `tanggalPerubahan` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `keterangan` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AbsensiSiswa` (
    `id` VARCHAR(191) NOT NULL,
    `jadwalSiswaId` VARCHAR(191) NOT NULL,
    `tanggal` DATE NOT NULL,
    `statusKehadiran` ENUM('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AbsensiGuru` (
    `id` VARCHAR(191) NOT NULL,
    `kelasProgramId` VARCHAR(191) NOT NULL,
    `tanggal` DATE NOT NULL,
    `jamMasuk` TIME NOT NULL,
    `jamKeluar` TIME NOT NULL,
    `sks` INTEGER NOT NULL,
    `suratIzin` VARCHAR(191) NULL,
    `statusKehadiran` ENUM('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

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
ALTER TABLE `KelasProgram` ADD CONSTRAINT `KelasProgram_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `Kelas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KelasProgram` ADD CONSTRAINT `KelasProgram_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `Program`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KelasProgram` ADD CONSTRAINT `KelasProgram_jamMengajarId_fkey` FOREIGN KEY (`jamMengajarId`) REFERENCES `JamMengajar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KelasProgram` ADD CONSTRAINT `KelasProgram_guruId_fkey` FOREIGN KEY (`guruId`) REFERENCES `Guru`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE `AbsensiSiswa` ADD CONSTRAINT `AbsensiSiswa_jadwalSiswaId_fkey` FOREIGN KEY (`jadwalSiswaId`) REFERENCES `JadwalSiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbsensiGuru` ADD CONSTRAINT `AbsensiGuru_kelasProgramId_fkey` FOREIGN KEY (`kelasProgramId`) REFERENCES `KelasProgram`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
