const BaseFactory = require('./base.factory');

class PendaftaranJadwalFactory extends BaseFactory {
  constructor() {
    super('pendaftaranJadwal');
  }

  definition() {
    return {
      pendaftaranId: null, // This needs to be specified
      hari: this.faker.helpers.arrayElement(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']),
      jamMengajarId: null, // This needs to be specified
      prioritas: this.faker.number.int({ min: 1, max: 3 }),
    };
  }
}

module.exports = new PendaftaranJadwalFactory();