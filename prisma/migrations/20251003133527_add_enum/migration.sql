-- AlterTable
ALTER TABLE `kelas` ADD COLUMN `warnaCard` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `pendaftarantemp` MODIFY `strataPendidikan` ENUM('BELUM_SEKOLAH', 'PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM') NULL;

-- AlterTable
ALTER TABLE `siswa` MODIFY `strataPendidikan` ENUM('BELUM_SEKOLAH', 'PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM') NULL;

-- AlterTable
ALTER TABLE `siswaprivatetemp` MODIFY `strataPendidikan` ENUM('BELUM_SEKOLAH', 'PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM') NULL;
