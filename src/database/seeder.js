const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcrypt');
const logger = require('../../lib/config/logger.config');

const PRODUCTION_PROGRAMS = [
    // Group Programs
    { name: 'PRA BTA', type: 'GROUP', spp: 250000 },
    { name: 'BTA LVL 1', type: 'GROUP', spp: 250000 },
    { name: 'BTA LVL 2 & PRA Tahsin', type: 'GROUP', spp: 250000 },
    { name: 'TAHSIN', type: 'GROUP', spp: 250000 },
    { name: 'TAHFIDZ', type: 'GROUP', spp: 250000 },
    // Private Programs
    { name: 'Private Mandiri', type: 'PRIVATE', spp: 250000 },
    { name: 'Private Bersaudara', type: 'PRIVATE', spp: 250000 },
    { name: 'Private Sharing', type: 'PRIVATE', spp: 250000 }
];

const PRODUCTION_KELAS = [
    'Kelas Nabawi',
    'Kelas Madinah',
    'Kelas Makkah',
    'Kelas Al-Aqsa',
    'Kelas Al-Hidayah',
    'Kelas Online'
];

// Jam mengajar berdasarkan aturan kerja: 10:00 - 20:45 WIB, 1 SKS = 1.5 jam
const PRODUCTION_JAM_MENGAJAR = [
    { jamMulai: '10:00', jamSelesai: '11:30' }, // SKS 1
    { jamMulai: '11:30', jamSelesai: '13:00' }, // SKS 2 (termasuk jam istirahat)
    { jamMulai: '13:00', jamSelesai: '14:30' }, // SKS 3
    { jamMulai: '14:30', jamSelesai: '16:00' }, // SKS 4
    { jamMulai: '16:00', jamSelesai: '17:30' }, // SKS 5
    { jamMulai: '17:30', jamSelesai: '19:00' }, // SKS 6 (termasuk jam istirahat)
    { jamMulai: '19:00', jamSelesai: '20:30' }, // SKS 7
    { jamMulai: '20:30', jamSelesai: '20:45' }  // SKS 8 (kelas terakhir)
];

const ADMIN_USER = {
    email: 'surauqurancenter@gmail.com',
    password: 'Padangp@sir7',
    role: 'ADMIN_SURAU'
};

const SUPER_ADMIN_USER = {
    email: 'superadmin@gmail.com',
    password: 'Padangp@sir7',
    role: 'SUPER_ADMIN'
};

class DatabaseSeeder {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async seed() {
    try {
      console.log('🌱 Starting production database seeding...');
      
      // Clear existing data
      await this.clearAllData();
      
      // Seed production data
      await this.seedUsers();
      await this.seedPrograms();
      await this.seedKelas();
      await this.seedJamMengajar();
      await this.seedChannels();
      
      console.log('✅ Production database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  async clearAllData() {
    console.log('🧹 Clearing existing data...');
    
    try {
      // Use Prisma's deleteMany for each model
      await this.prisma.kelasPengganti.deleteMany();
      console.log('  ✓ Cleared KelasPengganti');
      
      await this.prisma.jadwalProgramSiswa.deleteMany();
      console.log('  ✓ Cleared JadwalProgramSiswa');
      
      await this.prisma.riwayatStatusSiswa.deleteMany();
      console.log('  ✓ Cleared RiwayatStatusSiswa');
      
      await this.prisma.absensiSiswa.deleteMany();
      console.log('  ✓ Cleared AbsensiSiswa');
      
      await this.prisma.absensiGuru.deleteMany();
      console.log('  ✓ Cleared AbsensiGuru');
      
      await this.prisma.periodeSpp.deleteMany();
      console.log('  ✓ Cleared PeriodeSpp');
      
      await this.prisma.pembayaran.deleteMany();
      console.log('  ✓ Cleared Pembayaran');
      
      await this.prisma.pendaftaran.deleteMany();
      console.log('  ✓ Cleared Pendaftaran');
      
      await this.prisma.programSiswa.deleteMany();
      console.log('  ✓ Cleared ProgramSiswa');
      
      await this.prisma.payroll.deleteMany();
      console.log('  ✓ Cleared Payroll');
      
      await this.prisma.pendaftaranTemp.deleteMany();
      console.log('  ✓ Cleared PendaftaranTemp');
      
      await this.prisma.pendaftaranPrivateTemp.deleteMany();
      console.log('  ✓ Cleared PendaftaranPrivateTemp');
      
      await this.prisma.siswaPrivateTemp.deleteMany();
      console.log('  ✓ Cleared SiswaPrivateTemp');
      
      await this.prisma.siswa.deleteMany();
      console.log('  ✓ Cleared Siswa');
      
      await this.prisma.guru.deleteMany();
      console.log('  ✓ Cleared Guru');
      
      await this.prisma.admin.deleteMany();
      console.log('  ✓ Cleared Admin');
      
      await this.prisma.user.deleteMany();
      console.log('  ✓ Cleared User');
      
      await this.prisma.kelasProgram.deleteMany();
      console.log('  ✓ Cleared KelasProgram');
      
      await this.prisma.jamMengajar.deleteMany();
      console.log('  ✓ Cleared JamMengajar');
      
      await this.prisma.kelas.deleteMany();
      console.log('  ✓ Cleared Kelas');
      
      await this.prisma.program.deleteMany();
      console.log('  ✓ Cleared Program');
      
      await this.prisma.voucher.deleteMany();
      console.log('  ✓ Cleared Voucher');
      
      await this.prisma.chanel.deleteMany();
      console.log('  ✓ Cleared Chanel');
      
      await this.prisma.testimoni.deleteMany();
      console.log('  ✓ Cleared Testimoni');
      
      await this.prisma.galeri.deleteMany();
      console.log('  ✓ Cleared Galeri');
      
      await this.prisma.finance.deleteMany();
      console.log('  ✓ Cleared Finance');
      
    } catch (error) {
      console.log(`  ⚠️  Error clearing data: ${error.message}`);
    }
  }


  async seedUsers() {
    console.log('👤 Seeding production users...');
    
    const adminHashedPassword = await bcrypt.hash(ADMIN_USER.password, 10);
    const superAdminHashedPassword = await bcrypt.hash(SUPER_ADMIN_USER.password, 10);
    
    const users = [
      {
        email: ADMIN_USER.email,
        password: adminHashedPassword,
        role: ADMIN_USER.role
      },
      {
        email: SUPER_ADMIN_USER.email,
        password: superAdminHashedPassword,
        role: SUPER_ADMIN_USER.role
      }
    ];

    for (const userData of users) {
      await this.prisma.user.create({ data: userData });
      console.log(`  ✓ Created user: ${userData.email} (${userData.role})`);
    }
  }

  async seedPrograms() {
    console.log('📚 Seeding production programs...');
    
    for (const programData of PRODUCTION_PROGRAMS) {
      const program = await this.prisma.program.create({
        data: {
          namaProgram: programData.name,
          deskripsi: `Program ${programData.name} - ${programData.type}`,
          tipeProgram: programData.type,
          biayaSpp: programData.spp
        }
      });
      console.log(`  ✓ Created program: ${program.namaProgram} (${program.tipeProgram}) - Rp ${program.biayaSpp.toLocaleString('id-ID')}`);
    }
  }

  async seedKelas() {
    console.log('🏫 Seeding production kelas...');
    
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];
    
    for (let i = 0; i < PRODUCTION_KELAS.length; i++) {
      const kelas = await this.prisma.kelas.create({
        data: {
          namaKelas: PRODUCTION_KELAS[i],
          warnaCard: colors[i % colors.length]
        }
      });
      console.log(`  ✓ Created kelas: ${kelas.namaKelas}`);
    }
  }

  async seedJamMengajar() {
    console.log('⏰ Seeding production jam mengajar...');
    
    for (let i = 0; i < PRODUCTION_JAM_MENGAJAR.length; i++) {
      const jam = await this.prisma.jamMengajar.create({
        data: {
          jamMulai: PRODUCTION_JAM_MENGAJAR[i].jamMulai,
          jamSelesai: PRODUCTION_JAM_MENGAJAR[i].jamSelesai
        }
      });
      console.log(`  ✓ Created jam mengajar: ${jam.jamMulai} - ${jam.jamSelesai} (SKS ${i + 1})`);
    }
  }


  async seedChannels() {
    console.log('📺 Seeding production channels...');
    
    const channels = [
      {
        chanelName: 'Website',
        isOther: false,
        count: 0
      },
      {
        chanelName: 'Instagram',
        isOther: false,
        count: 0
      },
      {
        chanelName: 'Facebook',
        isOther: false,
        count: 0
      },
      {
        chanelName: 'WhatsApp',
        isOther: true,
        count: 0
      },
      {
        chanelName: 'Referral',
        isOther: true,
        count: 0
      }
    ];

    for (const channel of channels) {
      const createdChannel = await this.prisma.chanel.create({ data: channel });
      console.log(`  ✓ Created channel: ${createdChannel.chanelName}`);
    }
  }


  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = DatabaseSeeder;
