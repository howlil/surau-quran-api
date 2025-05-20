const BaseFactory = require('./base.factory');

class AbsensiGuruFactory extends BaseFactory {
  constructor() {
    super('absensiGuru');
  }

  definition() {
    const statusKehadiran = this.faker.helpers.arrayElement(['HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT']);
    const jamMasuk = this.faker.helpers.arrayElement(['10:00', '13:00', '15:00', '16:45', '19:00']);
    let jamKeluar;
    
    // Calculate jamKeluar based on jamMasuk
    switch(jamMasuk) {
      case '10:00': jamKeluar = '11:45'; break;
      case '13:00': jamKeluar = '14:45'; break;
      case '15:00': jamKeluar = '16:45'; break;
      case '16:45': jamKeluar = '18:30'; break;
      case '19:00': jamKeluar = '20:45'; break;
      default: jamKeluar = '20:00';
    }
    
    // SKS calculation (1 SKS = 45 minutes)
    const startHour = parseInt(jamMasuk.split(':')[0]);
    const startMin = parseInt(jamMasuk.split(':')[1]);
    const endHour = parseInt(jamKeluar.split(':')[0]);
    const endMin = parseInt(jamKeluar.split(':')[1]);
    
    const durationInMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    const sks = Math.round(durationInMinutes / 45);
    
    return {
      kelasProgramId: null, // This needs to be specified
      payrollId: null, // This may be specified later
      tanggal: this.faker.date.recent(60).toISOString().split('T')[0],
      jamMasuk,
      jamKeluar,
      sks,
      suratIzin: statusKehadiran === 'IZIN' || statusKehadiran === 'SAKIT' 
        ? `https://example.com/surat-izin-${this.faker.string.uuid()}.pdf` 
        : null,
      statusKehadiran,
    };
  }
}

module.exports = new AbsensiGuruFactory();