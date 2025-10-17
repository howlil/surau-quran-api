-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `rfid` VARCHAR(191) NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN', 'STUDENT', 'TEACHER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_rfid_key`(`rfid`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admins` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admins_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gallery` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `coverImage` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testimonials` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `photoUrl` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teachers` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `nip` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `whatsappNumber` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `gender` ENUM('MALE', 'FEMALE') NULL,
    `birthDate` VARCHAR(191) NULL,
    `profilePhoto` VARCHAR(191) NULL,
    `expertise` VARCHAR(191) NULL,
    `lastEducation` VARCHAR(191) NULL,
    `accountNumber` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `contractDocument` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `teachers_userId_key`(`userId`),
    UNIQUE INDEX `teachers_nip_key`(`nip`),
    INDEX `teachers_nip_idx`(`nip`),
    INDEX `teachers_name_idx`(`name`),
    INDEX `teachers_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacher_attendance` (
    `id` VARCHAR(191) NOT NULL,
    `classProgramId` VARCHAR(191) NOT NULL,
    `payrollId` VARCHAR(191) NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `timeIn` VARCHAR(191) NULL,
    `sks` INTEGER NOT NULL,
    `permissionLetter` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `attendanceStatus` ENUM('PRESENT', 'ABSENT', 'PERMISSION', 'SICK', 'NOT_ATTENDED', 'LATE') NOT NULL,
    `isLate` BOOLEAN NOT NULL DEFAULT false,
    `lateMinutes` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `teacher_attendance_teacherId_idx`(`teacherId`),
    INDEX `teacher_attendance_date_idx`(`date`),
    INDEX `teacher_attendance_attendanceStatus_idx`(`attendanceStatus`),
    INDEX `teacher_attendance_classProgramId_idx`(`classProgramId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `students` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `whatsappNumber` VARCHAR(191) NULL,
    `nis` VARCHAR(191) NULL,
    `studentName` VARCHAR(191) NOT NULL,
    `nickname` VARCHAR(191) NULL,
    `birthDate` VARCHAR(191) NULL,
    `gender` ENUM('MALE', 'FEMALE') NOT NULL,
    `address` VARCHAR(191) NULL,
    `educationLevel` ENUM('NOT_SCHOOL', 'PAUD', 'KINDERGARTEN', 'ELEMENTARY', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'UNIVERSITY', 'GENERAL') NULL,
    `schoolClass` VARCHAR(191) NULL,
    `schoolName` VARCHAR(191) NULL,
    `parentName` VARCHAR(191) NULL,
    `pickupPerson` VARCHAR(191) NULL,
    `familyCard` VARCHAR(191) NULL,
    `familyRelation` VARCHAR(191) NULL,
    `relationType` VARCHAR(191) NULL,
    `familyId` VARCHAR(191) NULL,
    `isFamily` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `students_userId_key`(`userId`),
    UNIQUE INDEX `students_nis_key`(`nis`),
    INDEX `students_nis_idx`(`nis`),
    INDEX `students_studentName_idx`(`studentName`),
    INDEX `students_createdAt_idx`(`createdAt`),
    INDEX `students_isFamily_idx`(`isFamily`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_attendance` (
    `id` VARCHAR(191) NOT NULL,
    `classProgramId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `attendanceStatus` ENUM('PRESENT', 'ABSENT', 'PERMISSION', 'SICK', 'NOT_ATTENDED', 'LATE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `student_attendance_studentId_idx`(`studentId`),
    INDEX `student_attendance_date_idx`(`date`),
    INDEX `student_attendance_attendanceStatus_idx`(`attendanceStatus`),
    INDEX `student_attendance_classProgramId_idx`(`classProgramId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentProgram` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `programId` VARCHAR(191) NOT NULL,
    `classProgramId` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'LEAVE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentSchedule` (
    `id` VARCHAR(191) NOT NULL,
    `studentProgramId` VARCHAR(191) NOT NULL,
    `dayOfWeek` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY') NOT NULL,
    `teachingTimeId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentStatusHistory` (
    `id` VARCHAR(191) NOT NULL,
    `studentProgramId` VARCHAR(191) NOT NULL,
    `oldStatus` ENUM('ACTIVE', 'INACTIVE', 'LEAVE') NOT NULL,
    `newStatus` ENUM('ACTIVE', 'INACTIVE', 'LEAVE') NOT NULL,
    `changeDate` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `substitute_classes` (
    `id` VARCHAR(191) NOT NULL,
    `classProgramId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `isTemp` BOOLEAN NOT NULL DEFAULT true,
    `date` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `substitute_classes_date_idx`(`date`),
    UNIQUE INDEX `substitute_classes_classProgramId_studentId_date_key`(`classProgramId`, `studentId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `classes` (
    `id` VARCHAR(191) NOT NULL,
    `className` VARCHAR(191) NOT NULL,
    `cardColor` VARCHAR(191) NULL,
    `hikvisionIpAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `classes_className_idx`(`className`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `programs` (
    `id` VARCHAR(191) NOT NULL,
    `programName` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `cover` VARCHAR(191) NULL,
    `programType` ENUM('GROUP', 'PRIVATE') NOT NULL DEFAULT 'GROUP',
    `sppFee` DECIMAL(10, 2) NOT NULL DEFAULT 300000.00,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `programs_programName_idx`(`programName`),
    INDEX `programs_programType_idx`(`programType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teaching_times` (
    `id` VARCHAR(191) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `teaching_times_startTime_idx`(`startTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_programs` (
    `id` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NULL,
    `programId` VARCHAR(191) NOT NULL,
    `dayOfWeek` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY') NOT NULL,
    `teachingTimeId` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `class_programs_programId_idx`(`programId`),
    INDEX `class_programs_dayOfWeek_idx`(`dayOfWeek`),
    INDEX `class_programs_teacherId_idx`(`teacherId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payrolls` (
    `id` VARCHAR(191) NOT NULL,
    `payoutId` VARCHAR(191) NULL,
    `referenceNo` VARCHAR(191) NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `month` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `totalAttendance` INTEGER NOT NULL DEFAULT 0,
    `totalLate` INTEGER NOT NULL DEFAULT 0,
    `totalNoNotice` INTEGER NOT NULL DEFAULT 0,
    `totalNoPermission` INTEGER NOT NULL DEFAULT 0,
    `attendanceIncentive` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `otherIncentive` DECIMAL(10, 2) NULL,
    `totalIncentive` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `lateDeduction` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `noNoticeDeduction` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `noPermissionDeduction` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalDeduction` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalSalary` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL,
    `notes` VARCHAR(191) NULL,
    `calculationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payrolls_payoutId_key`(`payoutId`),
    UNIQUE INDEX `payrolls_referenceNo_key`(`referenceNo`),
    INDEX `payrolls_teacherId_idx`(`teacherId`),
    INDEX `payrolls_month_year_idx`(`month`, `year`),
    INDEX `payrolls_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vouchers` (
    `id` VARCHAR(191) NOT NULL,
    `voucherCode` VARCHAR(191) NOT NULL,
    `voucherName` VARCHAR(191) NOT NULL,
    `type` ENUM('PERCENTAGE', 'NOMINAL') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vouchers_voucherCode_key`(`voucherCode`),
    INDEX `vouchers_voucherCode_idx`(`voucherCode`),
    INDEX `vouchers_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `spp_periods` (
    `id` VARCHAR(191) NOT NULL,
    `studentProgramId` VARCHAR(191) NOT NULL,
    `month` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `billingDate` VARCHAR(191) NOT NULL,
    `baseAmount` DECIMAL(10, 2) NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `spp_periods_paymentId_key`(`paymentId`),
    INDEX `spp_periods_month_year_idx`(`month`, `year`),
    INDEX `spp_periods_billingDate_idx`(`billingDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `enrollments` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `enrollmentFee` DECIMAL(10, 2) NOT NULL,
    `enrollmentDate` VARCHAR(191) NOT NULL,
    `baseAmount` DECIMAL(10, 2) NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `enrollments_studentId_key`(`studentId`),
    UNIQUE INDEX `enrollments_paymentId_key`(`paymentId`),
    INDEX `enrollments_enrollmentDate_idx`(`enrollmentDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `paymentType` ENUM('ENROLLMENT', 'SPP') NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `baseAmount` DECIMAL(10, 2) NOT NULL,
    `discount` DECIMAL(10, 2) NULL,
    `voucherAmount` DECIMAL(10, 2) NULL,
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `paymentStatus` ENUM('PENDING', 'SETTLEMENT', 'DENY', 'CANCEL', 'EXPIRE') NOT NULL,
    `paymentDate` VARCHAR(191) NOT NULL,
    `evidence` VARCHAR(191) NULL,
    `voucherId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_orderId_key`(`orderId`),
    UNIQUE INDEX `payments_transactionId_key`(`transactionId`),
    INDEX `payments_paymentType_idx`(`paymentType`),
    INDEX `payments_paymentStatus_idx`(`paymentStatus`),
    INDEX `payments_paymentDate_idx`(`paymentDate`),
    INDEX `payments_orderId_idx`(`orderId`),
    INDEX `payments_transactionId_idx`(`transactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance` (
    `id` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NULL,
    `date` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `incomeCategory` ENUM('SPP', 'ENROLLMENT', 'DONATION', 'OTHER_INCOME') NULL,
    `expenseCategory` ENUM('PAYROLL_SALARY', 'OPERATIONAL', 'UTILITIES', 'MAINTENANCE', 'MARKETING', 'SUPPLIES', 'OTHER_EXPENSE') NULL,
    `total` DECIMAL(12, 2) NOT NULL,
    `evidence` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `finance_sourceId_key`(`sourceId`),
    INDEX `finance_date_idx`(`date`),
    INDEX `finance_type_idx`(`type`),
    INDEX `finance_incomeCategory_idx`(`incomeCategory`),
    INDEX `finance_expenseCategory_idx`(`expenseCategory`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `enrollment_temp` (
    `id` VARCHAR(191) NOT NULL,
    `studentName` VARCHAR(191) NOT NULL,
    `nickname` VARCHAR(191) NULL,
    `birthDate` VARCHAR(191) NULL,
    `gender` ENUM('MALE', 'FEMALE') NOT NULL,
    `address` VARCHAR(191) NULL,
    `educationLevel` ENUM('NOT_SCHOOL', 'PAUD', 'KINDERGARTEN', 'ELEMENTARY', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'UNIVERSITY', 'GENERAL') NULL,
    `schoolClass` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `schoolName` VARCHAR(191) NULL,
    `parentName` VARCHAR(191) NOT NULL,
    `pickupPerson` VARCHAR(191) NULL,
    `whatsappNumber` VARCHAR(191) NULL,
    `programId` VARCHAR(191) NOT NULL,
    `voucherCode` VARCHAR(191) NULL,
    `enrollmentFee` DECIMAL(10, 2) NOT NULL,
    `discount` DECIMAL(10, 2) NOT NULL,
    `totalFee` DECIMAL(10, 2) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `voucherId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `enrollment_temp_paymentId_key`(`paymentId`),
    INDEX `enrollment_temp_email_idx`(`email`),
    INDEX `enrollment_temp_programId_idx`(`programId`),
    INDEX `enrollment_temp_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `private_enrollment_temp` (
    `id` VARCHAR(191) NOT NULL,
    `privateStudentId` VARCHAR(191) NOT NULL,
    `isFamily` BOOLEAN NOT NULL DEFAULT false,
    `familyRelation` VARCHAR(191) NULL,
    `relationType` VARCHAR(191) NULL,
    `familyCard` VARCHAR(191) NULL,
    `voucherCode` VARCHAR(191) NULL,
    `discount` DECIMAL(10, 2) NULL,
    `totalFee` DECIMAL(10, 2) NOT NULL,
    `programId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `private_enrollment_temp_programId_idx`(`programId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `private_student_temp` (
    `id` VARCHAR(191) NOT NULL,
    `studentName` VARCHAR(191) NOT NULL,
    `nickname` VARCHAR(191) NULL,
    `birthDate` VARCHAR(191) NULL,
    `gender` ENUM('MALE', 'FEMALE') NOT NULL,
    `address` VARCHAR(191) NULL,
    `educationLevel` ENUM('NOT_SCHOOL', 'PAUD', 'KINDERGARTEN', 'ELEMENTARY', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'UNIVERSITY', 'GENERAL') NULL,
    `schoolClass` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `schoolName` VARCHAR(191) NULL,
    `parentName` VARCHAR(191) NOT NULL,
    `pickupPerson` VARCHAR(191) NULL,
    `whatsappNumber` VARCHAR(191) NULL,
    `enrollmentFee` DECIMAL(10, 2) NOT NULL,

    INDEX `private_student_temp_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admins` ADD CONSTRAINT `admins_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_attendance` ADD CONSTRAINT `teacher_attendance_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `teachers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_attendance` ADD CONSTRAINT `teacher_attendance_payrollId_fkey` FOREIGN KEY (`payrollId`) REFERENCES `payrolls`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_attendance` ADD CONSTRAINT `teacher_attendance_classProgramId_fkey` FOREIGN KEY (`classProgramId`) REFERENCES `class_programs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_attendance` ADD CONSTRAINT `student_attendance_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_attendance` ADD CONSTRAINT `student_attendance_classProgramId_fkey` FOREIGN KEY (`classProgramId`) REFERENCES `class_programs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentProgram` ADD CONSTRAINT `StudentProgram_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentProgram` ADD CONSTRAINT `StudentProgram_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `programs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentProgram` ADD CONSTRAINT `StudentProgram_classProgramId_fkey` FOREIGN KEY (`classProgramId`) REFERENCES `class_programs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentSchedule` ADD CONSTRAINT `StudentSchedule_studentProgramId_fkey` FOREIGN KEY (`studentProgramId`) REFERENCES `StudentProgram`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentSchedule` ADD CONSTRAINT `StudentSchedule_teachingTimeId_fkey` FOREIGN KEY (`teachingTimeId`) REFERENCES `teaching_times`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentStatusHistory` ADD CONSTRAINT `StudentStatusHistory_studentProgramId_fkey` FOREIGN KEY (`studentProgramId`) REFERENCES `StudentProgram`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `substitute_classes` ADD CONSTRAINT `substitute_classes_classProgramId_fkey` FOREIGN KEY (`classProgramId`) REFERENCES `class_programs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `substitute_classes` ADD CONSTRAINT `substitute_classes_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_programs` ADD CONSTRAINT `class_programs_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_programs` ADD CONSTRAINT `class_programs_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `programs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_programs` ADD CONSTRAINT `class_programs_teachingTimeId_fkey` FOREIGN KEY (`teachingTimeId`) REFERENCES `teaching_times`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_programs` ADD CONSTRAINT `class_programs_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `teachers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payrolls` ADD CONSTRAINT `payrolls_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `teachers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spp_periods` ADD CONSTRAINT `spp_periods_studentProgramId_fkey` FOREIGN KEY (`studentProgramId`) REFERENCES `StudentProgram`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spp_periods` ADD CONSTRAINT `spp_periods_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `vouchers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `private_enrollment_temp` ADD CONSTRAINT `private_enrollment_temp_privateStudentId_fkey` FOREIGN KEY (`privateStudentId`) REFERENCES `private_student_temp`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
