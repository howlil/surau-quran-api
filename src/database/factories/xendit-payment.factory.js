const BaseFactory = require('./base.factory');

class XenditPaymentFactory extends BaseFactory {
  constructor() {
    super('xenditPayment');
  }

  definition() {
    const externalId = `INV-${this.faker.string.alphanumeric(10)}`;
    const xenditStatus = this.faker.helpers.arrayElement([
      'PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'FAILED'
    ]);
    const expireDate = this.faker.date.future(0.1).toISOString();
    const paidAt = xenditStatus === 'PENDING' || xenditStatus === 'EXPIRED' || xenditStatus === 'FAILED' 
      ? null 
      : this.faker.date.recent(5).toISOString();
    
    return {
      pembayaranId: null, // This needs to be specified
      xenditInvoiceId: `xnd_inv_${this.faker.string.alphanumeric(16)}`,
      xenditExternalId: externalId,
      xenditPaymentUrl: `https://checkout.xendit.co/web/${this.faker.string.alphanumeric(12)}`,
      xenditPaymentChannel: this.faker.helpers.arrayElement([
        'BANK_TRANSFER', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QR_CODE'
      ]),
      xenditExpireDate: expireDate,
      xenditPaidAt: paidAt,
      xenditStatus,
    };
  }
}

module.exports = new XenditPaymentFactory();