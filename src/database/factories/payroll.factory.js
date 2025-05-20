const BaseFactory = require('./base.factory');

class PayrollFactory extends BaseFactory {
  constructor() {
    super('payroll');
  }

  definition() {
    const bulan = this.faker.date.month();
    const tahun = this.faker.number.int({ min: 2023, max: 2025 });
    const periode = `${bulan} ${tahun}`;
    
    const gajiPokok = parseFloat(this.faker.finance.amount(3000000, 5000000, 0));
    const insentif = parseFloat(this.faker.finance.amount(200000, 1000000, 0));
    const potongan = parseFloat(this.faker.finance.amount(0, 500000, 0));
    const totalGaji = gajiPokok + insentif - potongan;
    
    return {
      guruId: null, // This needs to be specified
      periode,
      bulan,
      tahun,
      gajiPokok,
      insentif,
      potongan,
      totalGaji,
      status: this.faker.helpers.arrayElement(['DRAFT', 'DIPROSES', 'SELESAI', 'GAGAL']),
    };
  }
}

module.exports = new PayrollFactory();