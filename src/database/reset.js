const { PrismaClient } = require('../generated/prisma');

class DatabaseReset {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async reset() {
    try {
      console.log('🗑️  Starting database reset...');
      
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
      
      console.log('✅ Database reset completed successfully!');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }


  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = DatabaseReset;
