const BaseFactory = require('./base.factory');

class RiwayatStatusSiswaFactory extends BaseFactory {
  constructor() {
    super('riwayatStatusSiswa');
  }

  definition() {
    const statusOptions = ['AKTIF', 'TIDAK_AKTIF', 'CUTI'];
    const statusLama = this.faker.helpers.arrayElement(statusOptions);
    // Make sure status baru is different from status lama
    let statusBaru;
    do {
      statusBaru = this.faker.helpers.arrayElement(statusOptions);
    } while (statusBaru === statusLama);
    
    return {
      programSiswaId: null, // This needs to be specified
      statusLama,
      statusBaru,
      tanggalPerubahan: this.faker.date.recent(30).toISOString().split('T')[0],
      keterangan: this.faker.helpers.maybe(() => this.faker.lorem.sentence(), { probability: 0.7 }),
    };
  }
}

module.exports = new RiwayatStatusSiswaFactory();