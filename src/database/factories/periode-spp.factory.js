const BaseFactory = require('./base.factory');

class PeriodeSppFactory extends BaseFactory {
  constructor() {
    super('periodeSpp');
  }

  definition() {
    const bulan = this.faker.date.month();
    const tahun = this.faker.number.int({ min: 2023, max: 2025 });
    const tanggalTagihan = `${tahun}-${this.faker.number.int({ min: 1, max: 9 }).toString().padStart(2, '0')}-01`;
    const tanggalJatuhTempo = `${tahun}-${this.faker.number.int({ min: 1, max: 9 }).toString().padStart(2, '0')}-10`;
    
    const jumlahTagihan = parseFloat(this.faker.finance.amount(100000, 300000, 0));
    const diskon = parseFloat(this.faker.finance.amount(0, 50000, 0));
    const totalTagihan = jumlahTagihan - diskon;
    
    return {
      programSiswaId: null, // This needs to be specified
      bulan,
      tahun,
      tanggalTagihan,
      tanggalJatuhTempo,
      jumlahTagihan,
      voucherId: null, // This may be specified
      diskon,
      totalTagihan,
      statusPembayaran: this.faker.helpers.arrayElement([
        'UNPAID', 'PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'INACTIVE', 'ACTIVE', 'STOPPED'
      ]),
      pembayaranId: null, // This may be specified
    };
  }
}

module.exports = new PeriodeSppFactory();