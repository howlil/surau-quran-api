const BaseFactory = require('./base.factory');

class XenditCallbackInvoiceFactory extends BaseFactory {
  constructor() {
    super('xenditCallbackInvoice');
  }

  definition() {
    const status = this.faker.helpers.arrayElement([
      'PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'FAILED'
    ]);
    
    const amount = parseFloat(this.faker.finance.amount(100000, 500000, 0));
    
    // Create a realistic callback payload
    const rawResponse = {
      id: `xnd_inv_${this.faker.string.alphanumeric(16)}`,
      external_id: `INV-${this.faker.string.alphanumeric(10)}`,
      user_id: `xnd_user_${this.faker.string.alphanumeric(12)}`,
      status,
      merchant_name: "Surau Quran",
      amount,
      paid_amount: status === 'PAID' || status === 'SETTLED' ? amount : 0,
      bank_code: this.faker.helpers.arrayElement(['BCA', 'BNI', 'MANDIRI', 'BRI']),
      paid_at: status === 'PAID' || status === 'SETTLED' ? this.faker.date.recent(3).toISOString() : null,
      payer_email: this.faker.internet.email(),
      description: `Pembayaran untuk ${this.faker.helpers.arrayElement(['Pendaftaran', 'SPP'])}`,
      created: this.faker.date.recent(10).toISOString(),
      updated: this.faker.date.recent(2).toISOString(),
      currency: "IDR",
      payment_channel: this.faker.helpers.arrayElement([
        'BANK_TRANSFER', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QR_CODE'
      ]),
      payment_method: this.faker.helpers.arrayElement([
        'BCA', 'BNI', 'GOPAY', 'OVO', 'DANA', 'ALFAMART', 'CREDIT_CARD', 'QRIS'
      ]),
    };
    
    return {
      xenditPaymentId: null, // This needs to be specified
      eventType: `invoice.${status === 'PAID' ? 'paid' : status.toLowerCase()}`,
      rawResponse,
      amount,
      status,
    };
  }
}

module.exports = new XenditCallbackInvoiceFactory();