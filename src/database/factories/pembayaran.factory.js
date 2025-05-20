const BaseFactory = require('./base.factory');

class PembayaranFactory extends BaseFactory {
  constructor() {
    super('pembayaran');
  }

  definition() {
    const tipePembayaran = this.faker.helpers.arrayElement(['PENDAFTARAN', 'SPP']);
    const metodePembayaran = this.faker.helpers.arrayElement([
      'TUNAI', 'VIRTUAL_ACCOUNT', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QR_CODE'
    ]);
    const statusPembayaran = this.faker.helpers.arrayElement([
      'UNPAID', 'PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'INACTIVE', 'ACTIVE', 'STOPPED'
    ]);
    
    return {
      tipePembayaran,
      metodePembayaran,
      jumlahTagihan: parseFloat(this.faker.finance.amount(100000, 500000, 0)),
      statusPembayaran,
      tanggalPembayaran: this.faker.date.recent(30).toISOString().split('T')[0],
    };
  }
}

module.exports = new PembayaranFactory();