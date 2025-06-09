/*
  Warnings:

  - Added the required column `urutan` to the `JadwalProgramSiswa` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `jadwalprogramsiswa` ADD COLUMN `urutan` INTEGER NOT NULL;
