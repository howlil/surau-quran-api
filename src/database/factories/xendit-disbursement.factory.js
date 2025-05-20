const BaseFactory = require('./base.factory');

class XenditDisbursementFactory extends BaseFactory {
  constructor() {
    super('xenditDisbursement');
  }

  definition() {
    const xenditStatus = this.faker.helpers.arrayElement([
      'PENDING', 'COMPLETED', 'FAILED'
    ]);
    
    const xenditCreatedAt = this.faker.date.recent(15).toISOString();
    const xenditUpdatedAt = xenditStatus !== 'PENDING' ? this.faker.date.recent(5).toISOString() : null;
    
    const amount = parseFloat(this.faker.finance.amount(3000000, 6000000, 0));
    
    // Create a realistic disbursement response data
    const rawResponse = {
      id: `xnd_dsb_${this.faker.string.alphanumeric(16)}`,
      external_id: `PAYROLL-${this.faker.string.alphanumeric(10)}`,
      amount,
      bank_code: this.faker.helpers.arrayElement(['BCA', 'BNI', 'MANDIRI', 'BRI']),
      account_holder_name: this.faker.person.fullName(),
      disbursement_description: `Gaji Guru Periode ${this.faker.date.month()} ${this.faker.number.int({ min: 2023, max: 2025 })}`,
      status: xenditStatus,
      created: xenditCreatedAt,
      updated: xenditUpdatedAt,
      email_to: this.faker.helpers.arrayElement([null, this.faker.internet.email()]),
      email_cc: [],
      email_bcc: [],
    };
    
    return {
      payrollDisbursementId: null, // This needs to be specified
      xenditDisbursementId: `xnd_dsb_${this.faker.string.alphanumeric(16)}`,
      xenditExternalId: `PAYROLL-${this.faker.string.alphanumeric(10)}`,
      xenditAmount: amount,
      xenditStatus,
      xenditCreatedAt,
      xenditUpdatedAt,
      rawResponse,
    };
  }
}

module.exports = new XenditDisbursementFactory();