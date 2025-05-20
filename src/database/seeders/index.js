const { logger } = require('../../lib/config/logger.config');
const { prisma } = require('../../lib/config/prisma.config');

const CustomAccountsSeeder = require('./custom-accounts.seeder');
const UserSeeder = require('./user.seeder');
const AdminSeeder = require('./admin.seeder');
const GuruSeeder = require('./guru.seeder');
const SiswaSeeder = require('./siswa.seeder');
const KelasSeeder = require('./kelas.seeder');
const ProgramSeeder = require('./program.seeder');
const JamMengajarSeeder = require('./jam-mengajar.seeder');
const KelasProgramSeeder = require('./kelas-program.seeder');
const ProgramSiswaSeeder = require('./program-siswa.seeder');
const JadwalSiswaSeeder = require('./jadwal-siswa.seeder');
const RiwayatStatusSiswaSeeder = require('./riwayat-status-siswa.seeder');
const AbsensiSiswaSeeder = require('./absensi-siswa.seeder');
const AbsensiGuruSeeder = require('./absensi-guru.seeder');
const VoucherSeeder = require('./voucher.seeder');
const PembayaranAndPendaftaranSeeder = require('./pembayaran-pendaftaran.seeder');
const PendaftaranJadwalSeeder = require('./pendaftaran-jadwal.seeder');
const PeriodeSppSeeder = require('./periode-spp.seeder');
const XenditPaymentSeeder = require('./xendit-payment.seeder');
const PayrollSeeder = require('./payroll.seeder');
const TokenSeeder = require('./token.seeder');

async function seed() {
  try {
    logger.info('Starting database seeding...');

    // Seed custom accounts first
    const customAccounts = await CustomAccountsSeeder.seed();
    logger.info('Custom accounts seeded successfully');

    // Seed basic education structure first (no dependencies)
    const kelases = await KelasSeeder.seed();
    const programs = await ProgramSeeder.seed();
    const jamMengajars = await JamMengajarSeeder.seed();
    const vouchers = await VoucherSeeder.seed();

    // Debug log to check arrays
    logger.info(`After initial seeding: ${kelases?.length || 0} kelases, ${programs?.length || 0} programs, ${jamMengajars?.length || 0} jam mengajars`);

    // Seed users and their profiles
    const { adminUsers, guruUsers, siswaUsers } = await UserSeeder.seed();
    const admins = await AdminSeeder.seed(adminUsers);
    const gurus = await GuruSeeder.seed(guruUsers);
    const siswas = await SiswaSeeder.seed(siswaUsers);

    // Combine custom accounts with seeded accounts for further processing
    const allAdminUsers = [customAccounts.adminUser, ...adminUsers];
    const allGuruUsers = [customAccounts.guruUser, ...guruUsers];
    const allSiswaUsers = [customAccounts.siswaUser, ...siswaUsers];
    const allAdmins = [customAccounts.admin, ...admins];
    const allGurus = [customAccounts.guru, ...gurus];
    const allSiswas = [customAccounts.siswa, ...siswas];

    // Debug log to check arrays
    logger.info(`After user seeding: ${allGurus?.length || 0} gurus`);

    // Generate tokens for some users
    const tokens = await TokenSeeder.seed([...allAdminUsers, ...allGuruUsers, ...allSiswaUsers]);

    // Create relationships
    const kelasPrograms = await KelasProgramSeeder.seed({
      kelases,
      programs,
      jamMengajars,
      gurus: allGurus
    });

    // Seed student enrollments
    const programSiswas = await ProgramSiswaSeeder.seed({
      siswas: allSiswas,
      programs
    });

    // Track status changes for some students
    const riwayatStatusSiswas = await RiwayatStatusSiswaSeeder.seed({
      programSiswas
    });

    // Seed student schedules
    const jadwalSiswas = await JadwalSiswaSeeder.seed({
      programSiswas,
      kelasPrograms
    });

    // Seed attendance records
    const absensiSiswas = await AbsensiSiswaSeeder.seed({
      jadwalSiswas,
      kelasPrograms
    });

    const absensiGurus = await AbsensiGuruSeeder.seed({
      kelasPrograms
    });

    // Seed financial data
    const { pembayarans, pendaftarans } = await PembayaranAndPendaftaranSeeder.seed({
      programSiswas,
      vouchers
    });

    // Seed pendaftaran jadwal preferences
    const pendaftaranJadwals = await PendaftaranJadwalSeeder.seed({
      pendaftarans,
      jamMengajars
    });

    const periodeSpp = await PeriodeSppSeeder.seed({
      programSiswas,
      vouchers
    });

    // Seed Xendit payment data
    const xenditPayments = await XenditPaymentSeeder.seed({
      pembayarans
    });

    // Seed payroll data
    const { payrolls, payrollDisbursements, xenditDisbursements } = await PayrollSeeder.seed({
      gurus: allGurus,
      absensiGurus
    });

    logger.info('Database seeding completed successfully');

    return {
      customAccounts,
      kelases,
      programs,
      jamMengajars,
      adminUsers: allAdminUsers,
      guruUsers: allGuruUsers,
      siswaUsers: allSiswaUsers,
      admins: allAdmins,
      gurus: allGurus,
      siswas: allSiswas,
      kelasPrograms,
      programSiswas,
      jadwalSiswas,
      riwayatStatusSiswas,
      absensiSiswas,
      absensiGurus,
      vouchers,
      pembayarans,
      pendaftarans,
      pendaftaranJadwals,
      periodeSpp,
      xenditPayments,
      payrolls,
      payrollDisbursements,
      xenditDisbursements,
      tokens
    };
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
}

// Run seed function if executed directly
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();

  seed()
    .then(() => {
      logger.info('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      // Disconnect Prisma client
      await prisma.$disconnect();
    });
}

module.exports = seed;
module.exports = seed;