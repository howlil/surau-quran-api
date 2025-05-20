const BaseFactory = require('./base.factory');

class XenditCallbackDisbursementFactory extends BaseFactory {
  constructor() {
    super('xenditCallbackDisbursement');
  }

  definition() {
    const status = this.faker.helpers.arrayElement([
      'PENDING', 'COMPLETED', 'FAILED'
    ]);
    
    const amount = parseFloat(this.faker.finance.amount(3000000, 6000000, 0));
    
    // Create a realistic callback payload
    const rawResponse = {
      id: `xnd_dsb_${this.faker.string.alphanumeric(16)}`,
      external_id: `PAYROLL-${this.faker.string.alphanumeric(10)}`,
      amount,
      bank_code: this.faker.helpers.arrayElement(['BCA', 'BNI', 'MANDIRI', 'BRI']),
      account_holder_name: this.faker.person.fullName(),
      disbursement_description: `Gaji Guru Periode ${this.faker.date.month()} ${this.faker.number.int({ min: 2023, max: 2025 })}`,
      status,
      created: this.faker.date.recent(10).toISOString(),
      updated: this.faker.date.recent(2).toISOString(),
      failure_code: status === 'FAILED' ? this.faker.helpers.arrayElement([
        'ACCOUNT_NOT_FOUND', 'INVALID_ACCOUNT_DETAILS', 'INSUFFICIENT_BALANCE', 'TRANSFER_ERROR'
      ]) : null,
    };
    
    return {
      xenditDisbursementId: null, // This needs to be specified
      eventType: `disbursement.${status.toLowerCase()}`,
      rawResponse,
      amount,
      status,
    };
  }
}

module.exports = new XenditCallbackDisbursementFactory();