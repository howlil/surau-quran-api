const BaseFactory = require('./base.factory');

class AbsensiSiswaFactory extends BaseFactory {
  constructor() {
    super('absensiSiswa');
  }

  definition() {
    return {
      kelasProgramId: null, // This needs to be specified
      tanggal: this.faker.date.recent(60).toISOString().split('T')[0],
      statusKehadiran: this.faker.helpers.arrayElement(['HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT']),
    };
  }
}

module.exports = new AbsensiSiswaFactory();