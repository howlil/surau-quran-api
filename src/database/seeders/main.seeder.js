const { SeederUtils, prisma } = require('./utils');

// Import all factories
const UserFactory = require('../factories/user.factory');
const AdminFactory = require('../factories/admin.factory');
const GuruFactory = require('../factories/guru.factory');
const SiswaFactory = require('../factories/siswa.factory');
const KelasFactory = require('../factories/kelas.factory');
const ProgramFactory = require('../factories/program.factory');
const JamMengajarFactory = require('../factories/jam-mengajar.factory');
const KelasProgramFactory = require('../factories/kelas-program.factory');
const VoucherFactory = require('../factories/voucher.factory');
const PendaftaranFactory = require('../factories/pendaftaran.factory');
const ProgramSiswaFactory = require('../factories/program-siswa.factory');
const JadwalProgramSiswaFactory = require('../factories/jadwal-program-siswa.factory');
const AbsensiSiswaFactory = require('../factories/absensi-siswa.factory');
const AbsensiGuruFactory = require('../factories/absensi-guru.factory');
const PeriodeSppFactory = require('../factories/periode-spp.factory');
const PembayaranFactory = require('../factories/pembayaran.factory');
const PayrollFactory = require('../factories/payroll.factory');
const RiwayatStatusSiswaFactory = require('../factories/riwayat-status-siswa.factory');
const TokenFactory = require('../factories/token.factory');
const XenditPaymentFactory = require('../factories/xendit-payment.factory');
const XenditDisbursementFactory = require('../factories/xendit-disbursement.factory');
const PayrollDisbursementFactory = require('../factories/payroll-disbursement.factory');
const PendaftaranTempFactory = require('../factories/pendaftaran-temp.factory');

class MainSeeder {
    static async run() {
        console.log('🚀 Starting comprehensive database seeding...');

        // Step 1: Create users and roles
        const users = await this.createUsersAndRoles();
        console.log(`✅ Created ${users.admin.length} admins, ${users.guru.length} gurus, ${users.siswa.length} siswas`);

        // Step 2: Create master data
        const masterData = await this.createMasterData();
        console.log(`✅ Created master data: ${masterData.kelas.length} kelas, ${masterData.program.length} programs, ${masterData.jamMengajar.length} jam mengajar`);

        // Step 3: Create vouchers 
        const vouchers = await this.createVouchers();
        console.log(`✅ Created ${vouchers.length} vouchers`);

        // Step 4: Create kelas programs (connecting kelas, program, guru, jam mengajar)
        const kelasPrograms = await this.createKelasPrograms(
            masterData.kelas,
            masterData.program,
            users.guru,
            masterData.jamMengajar
        );
        console.log(`✅ Created ${kelasPrograms.length} kelas programs`);

        // Step 5: Create comprehensive student enrollments
        const enrollmentData = await this.createComprehensiveStudentEnrollments(
            users.siswa,
            masterData.program,
            kelasPrograms,
            vouchers
        );
        console.log(`✅ Created student enrollments: ${enrollmentData.verified} verified, ${enrollmentData.unverified} unverified`);

        // Step 6: Create comprehensive attendance records
        const attendanceData = await this.createComprehensiveAttendance(kelasPrograms);
        console.log(`✅ Created attendance: ${attendanceData.siswa} siswa records, ${attendanceData.guru} guru records`);

        // Step 7: Create comprehensive SPP and payments
        const paymentData = await this.createComprehensiveSppAndPayments();
        console.log(`✅ Created SPP and payments: ${paymentData.spp} SPP periods, ${paymentData.payments} payments`);

        // Step 8: Create payroll system
        const payrollData = await this.createPayrollSystem(users.guru);
        console.log(`✅ Created payroll: ${payrollData.payrolls} payrolls, ${payrollData.disbursements} disbursements`);

        // Step 9: Create authentication tokens
        const tokenData = await this.createAuthenticationTokens([...users.admin, ...users.guru, ...users.siswa]);
        console.log(`✅ Created authentication tokens: ${tokenData.active} active, ${tokenData.expired} expired`);

        // Step 10: Create temporary registrations (pending)
        const tempRegistrations = await this.createTemporaryRegistrations(masterData.program, vouchers);
        console.log(`✅ Created ${tempRegistrations.length} temporary registrations`);

        // Step 11: Create student status history
        const statusHistory = await this.createStudentStatusHistory();
        console.log(`✅ Created student status history records`);

        console.log('🎉 Comprehensive database seeding completed successfully!');
    }

    static async createUsersAndRoles() {
        console.log('👥 Creating users and roles...');

        // Create users for different roles
        const adminUsers = await UserFactory.createMany(5, { role: 'ADMIN' });
        const guruUsers = await UserFactory.createMany(25, { role: 'GURU' });
        const siswaUsers = await UserFactory.createMany(200, { role: 'SISWA' }); // Increased for more comprehensive data

        // Create admin profiles
        const admins = [];
        for (const user of adminUsers) {
            const admin = await AdminFactory.create({ userId: user.id });
            admins.push({ ...admin, user });
        }

        // Create guru profiles
        const gurus = [];
        for (const user of guruUsers) {
            const guru = await GuruFactory.create({ userId: user.id });
            gurus.push({ ...guru, user });
        }

        // Create siswa profiles
        const siswas = [];
        for (const user of siswaUsers) {
            const siswa = await SiswaFactory.create({ userId: user.id });
            siswas.push({ ...siswa, user });
        }

        return { admin: admins, guru: gurus, siswa: siswas };
    }

    static async createMasterData() {
        console.log('📚 Creating master data...');

        // Create kelas (20 classes for more comprehensive data)
        const kelas = await KelasFactory.createMany(20);

        // Create programs (15 diverse programs)
        const program = await ProgramFactory.createMany(15);

        // Create jam mengajar (30 time slots for flexibility)
        const jamMengajar = await JamMengajarFactory.createMany(30);

        return { kelas, program, jamMengajar };
    }

    static async createVouchers() {
        console.log('🎫 Creating vouchers...');
        return await VoucherFactory.createMany(40); // More vouchers for variety
    }

    static async createKelasPrograms(kelas, programs, gurus, jamMengajars) {
        console.log('🏫 Creating kelas programs...');

        const kelasPrograms = [];
        const usedCombinations = new Set();

        // Create 80-100 kelas programs to ensure good coverage
        for (let i = 0; i < 100; i++) {
            const selectedKelas = SeederUtils.getRandomElement(kelas);
            const selectedProgram = SeederUtils.getRandomElement(programs);
            const combination = `${selectedKelas.id}-${selectedProgram.id}`;

            // Avoid exact duplicates
            if (usedCombinations.has(combination)) {
                continue;
            }
            usedCombinations.add(combination);

            const selectedGuru = SeederUtils.getRandomElement(gurus);
            const selectedJamMengajar = SeederUtils.getRandomElement(jamMengajars);

            const kelasProgram = await KelasProgramFactory.create({
                kelasId: selectedKelas.id,
                programId: selectedProgram.id,
                guruId: selectedGuru.id,
                jamMengajarId: selectedJamMengajar.id
            });

            kelasPrograms.push(kelasProgram);
        }

        return kelasPrograms;
    }

    static async createComprehensiveStudentEnrollments(siswas, programs, kelasPrograms, vouchers) {
        console.log('📝 Creating comprehensive student enrollments...');

        let verifiedCount = 0;
        let unverifiedCount = 0;

        for (const siswa of siswas) {
            // Each student gets exactly one program
            const selectedProgram = SeederUtils.getRandomElement(programs);

            // 60% chance student is verified and assigned to kelas program
            const isVerified = Math.random() < 0.6;

            let kelasProgramId = null;
            if (isVerified) {
                // Find available kelas programs for this program
                const availableKelasPrograms = kelasPrograms.filter(kp => kp.programId === selectedProgram.id);
                if (availableKelasPrograms.length > 0) {
                    const selectedKelasProgram = SeederUtils.getRandomElement(availableKelasPrograms);
                    kelasProgramId = selectedKelasProgram.id;
                    verifiedCount++;
                } else {
                    // If no kelas program available, make unverified
                    unverifiedCount++;
                }
            } else {
                unverifiedCount++;
            }

            // Create program siswa
            const programSiswa = await ProgramSiswaFactory.create({
                siswaId: siswa.id,
                programId: selectedProgram.id,
                kelasProgramId: kelasProgramId,
                isVerified: isVerified,
                status: isVerified ? 'AKTIF' : SeederUtils.getRandomElement(['AKTIF', 'TIDAK_AKTIF'])
            });

            // Create jadwal for verified students
            if (isVerified && kelasProgramId) {
                // Create 2-4 jadwal sessions per week
                const sessionCount = SeederUtils.getRandomNumber(2, 4);
                const usedDays = new Set();

                for (let j = 0; j < sessionCount; j++) {
                    const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
                    let selectedDay;
                    do {
                        selectedDay = SeederUtils.getRandomElement(days);
                    } while (usedDays.has(selectedDay));
                    usedDays.add(selectedDay);

                    await JadwalProgramSiswaFactory.create({
                        programSiswaId: programSiswa.id,
                        hari: selectedDay,
                        urutan: j + 1
                    });
                }
            }

            // Create pendaftaran
            const selectedVoucher = Math.random() < 0.3 ? SeederUtils.getRandomElement(vouchers) : null;

            await PendaftaranFactory.create({
                siswaId: siswa.id,
                programId: selectedProgram.id,
                voucherId: selectedVoucher?.id || null
            });

            // Create payment for pendaftaran
            const paymentMethod = SeederUtils.getRandomElement(['CASH', 'TRANSFER', 'XENDIT']);
            const pembayaran = await PembayaranFactory.create({
                siswaId: siswa.id,
                jenisPembayaran: 'PENDAFTARAN',
                metodePembayaran: paymentMethod,
                jumlah: selectedVoucher ?
                    Math.max(0, selectedProgram.biayaPendaftaran - selectedVoucher.nilaiDiskon) :
                    selectedProgram.biayaPendaftaran
            });

            // Create xendit payment if method is XENDIT
            if (paymentMethod === 'XENDIT') {
                await XenditPaymentFactory.create({
                    pembayaranId: pembayaran.id,
                    status: 'PAID'
                });
            }
        }

        return { verified: verifiedCount, unverified: unverifiedCount };
    }

    static async createComprehensiveAttendance(kelasPrograms) {
        console.log('📊 Creating comprehensive attendance records...');

        let siswaAttendanceCount = 0;
        let guruAttendanceCount = 0;

        for (const kelasProgram of kelasPrograms) {
            // Get students in this kelas program
            const programSiswas = await prisma.programSiswa.findMany({
                where: {
                    kelasProgramId: kelasProgram.id,
                    isVerified: true,
                    status: 'AKTIF'
                }
            });

            if (programSiswas.length === 0) continue;

            // Create 40-80 session records for each kelas program
            const sessionCount = SeederUtils.getRandomNumber(40, 80);

            for (let session = 0; session < sessionCount; session++) {
                // Create guru attendance for this session
                await AbsensiGuruFactory.create({
                    guruId: kelasProgram.guruId,
                    kelasProgramId: kelasProgram.id
                });
                guruAttendanceCount++;

                // Create siswa attendance for each student (80% attendance rate)
                for (const programSiswa of programSiswas) {
                    if (Math.random() < 0.8) { // 80% attendance rate
                        await AbsensiSiswaFactory.create({
                            siswaId: programSiswa.siswaId,
                            kelasProgramId: kelasProgram.id
                        });
                        siswaAttendanceCount++;
                    }
                }
            }
        }

        return { siswa: siswaAttendanceCount, guru: guruAttendanceCount };
    }

    static async createComprehensiveSppAndPayments() {
        console.log('💰 Creating comprehensive SPP and payments...');

        // Get all active students
        const activeStudents = await prisma.programSiswa.findMany({
            where: {
                status: 'AKTIF',
                isVerified: true
            },
            include: { program: true }
        });

        let sppCount = 0;
        let paymentCount = 0;

        for (const programSiswa of activeStudents) {
            // Create 8-15 months of SPP for each student
            const monthCount = SeederUtils.getRandomNumber(8, 15);

            for (let month = 0; month < monthCount; month++) {
                const periode = await PeriodeSppFactory.create({
                    siswaId: programSiswa.siswaId,
                    programId: programSiswa.programId,
                    jumlah: programSiswa.program.biayaSpp
                });
                sppCount++;

                // 85% of SPP periods have payments
                if (Math.random() < 0.85) {
                    const paymentMethod = SeederUtils.getRandomElement(['CASH', 'TRANSFER', 'XENDIT']);
                    const pembayaran = await PembayaranFactory.create({
                        siswaId: programSiswa.siswaId,
                        jenisPembayaran: 'SPP',
                        metodePembayaran: paymentMethod,
                        jumlah: programSiswa.program.biayaSpp
                    });
                    paymentCount++;

                    // Create xendit payment if method is XENDIT
                    if (paymentMethod === 'XENDIT') {
                        await XenditPaymentFactory.create({
                            pembayaranId: pembayaran.id,
                            status: SeederUtils.getRandomElement(['PAID', 'PENDING', 'FAILED'])
                        });
                    }
                }
            }
        }

        return { spp: sppCount, payments: paymentCount };
    }

    static async createPayrollSystem(gurus) {
        console.log('💼 Creating payroll system...');

        let payrollCount = 0;
        let disbursementCount = 0;

        for (const guru of gurus) {
            // Get guru's attendance records
            const attendanceRecords = await prisma.absensiGuru.findMany({
                where: { guruId: guru.id },
                take: SeederUtils.getRandomNumber(20, 40) // Use 20-40 attendance records per payroll
            });

            if (attendanceRecords.length === 0) continue;

            // Create 3-6 payroll records per guru
            const payrollRecordCount = SeederUtils.getRandomNumber(3, 6);

            for (let i = 0; i < payrollRecordCount; i++) {
                const payroll = await PayrollFactory.create({
                    guruId: guru.id
                });
                payrollCount++;

                // 70% of payrolls have disbursements
                if (Math.random() < 0.7) {
                    const disbursement = await PayrollDisbursementFactory.create({
                        payrollId: payroll.id
                    });
                    disbursementCount++;

                    // Create xendit disbursement record
                    await XenditDisbursementFactory.create({
                        payrollDisbursementId: disbursement.id,
                        status: SeederUtils.getRandomElement(['COMPLETED', 'PENDING', 'FAILED'])
                    });
                }
            }
        }

        return { payrolls: payrollCount, disbursements: disbursementCount };
    }

    static async createAuthenticationTokens(users) {
        console.log('🔐 Creating authentication tokens...');

        let activeTokens = 0;
        let expiredTokens = 0;

        for (const user of users) {
            // 85% of users have at least one active token
            if (Math.random() < 0.85) {
                // Create 1-3 tokens per user (different devices)
                const tokenCount = SeederUtils.getRandomNumber(1, 3);

                for (let i = 0; i < tokenCount; i++) {
                    const isExpired = Math.random() < 0.15; // 15% chance token is expired

                    await TokenFactory.create({
                        userId: user.userId || user.id,
                        isExpired: isExpired
                    });

                    if (isExpired) {
                        expiredTokens++;
                    } else {
                        activeTokens++;
                    }
                }
            }
        }

        return { active: activeTokens, expired: expiredTokens };
    }

    static async createTemporaryRegistrations(programs, vouchers) {
        console.log('⏳ Creating temporary registrations...');

        const tempRegistrations = [];

        // Create 50 temporary registrations (pending applications)
        for (let i = 0; i < 50; i++) {
            const selectedProgram = SeederUtils.getRandomElement(programs);
            const selectedVoucher = Math.random() < 0.2 ? SeederUtils.getRandomElement(vouchers) : null;

            const tempReg = await PendaftaranTempFactory.create({
                programId: selectedProgram.id,
                voucherId: selectedVoucher?.id || null
            });

            tempRegistrations.push(tempReg);
        }

        return tempRegistrations;
    }

    static async createStudentStatusHistory() {
        console.log('📈 Creating student status history...');

        // Get students who have status changes
        const programSiswas = await prisma.programSiswa.findMany({
            where: {
                OR: [
                    { status: 'TIDAK_AKTIF' },
                    { status: 'CUTI' }
                ]
            }
        });

        // Create status history for 50% of students with status changes
        for (const programSiswa of programSiswas) {
            if (Math.random() < 0.5) {
                await RiwayatStatusSiswaFactory.create({
                    programSiswaId: programSiswa.id,
                    statusLama: 'AKTIF',
                    statusBaru: programSiswa.status
                });
            }
        }
    }
}

module.exports = MainSeeder; 