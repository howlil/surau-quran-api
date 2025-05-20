const BaseFactory = require('./base.factory');

class PendaftaranFactory extends BaseFactory {
  constructor() {
    super('pendaftaran');
  }

  definition() {
    const biayaPendaftaran = parseFloat(this.faker.finance.amount(100000, 300000, 0));
    const diskon = parseFloat(this.faker.finance.amount(0, 50000, 0));
    const totalBiaya = biayaPendaftaran - diskon;
    
    return {
      siswaId: null, // This needs to be specified
      programSiswaId: null, // This needs to be specified
      pembayaranId: null, // This needs to be specified
      biayaPendaftaran,
      tanggalDaftar: this.faker.date.recent(60).toISOString().split('T')[0],
      voucherId: null, // This may be specified
      diskon,
      totalBiaya,
      statusVerifikasi: this.faker.helpers.arrayElement(['MENUNGGU', 'DIVERIFIKASI']),
    };
  }
}

module.exports = new PendaftaranFactory();