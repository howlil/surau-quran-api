/*
  Warnings:

  - A unique constraint covering the columns `[rfid]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `rfid` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_rfid_key` ON `User`(`rfid`);
