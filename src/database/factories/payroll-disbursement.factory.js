const BaseFactory = require('./base.factory');

class PayrollDisbursementFactory extends BaseFactory {
  constructor() {
    super('payrollDisbursement');
  }

  definition() {
    return {
      payrollId: null, // This needs to be specified
      amount: parseFloat(this.faker.finance.amount(3000000, 6000000, 0)),
      tanggalProses: this.faker.date.recent(10).toISOString().split('T')[0],
    };
  }
}

module.exports = new PayrollDisbursementFactory();