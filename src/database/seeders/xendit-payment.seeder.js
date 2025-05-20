const { logger } = require('../../lib/config/logger.config');
const xenditPaymentFactory = require('../factories/xendit-payment.factory');
const xenditCallbackInvoiceFactory = require('../factories/xendit-callback-invoice.factory');
const { faker } = require('@faker-js/faker');

class XenditPaymentSeeder {
  static async seed({ pembayarans }) {
    try {
      logger.info('Seeding Xendit payments...');

      const xenditPayments = [];
      const xenditCallbacks = [];

      // Only create Xendit payments for pembayaran with non-TUNAI payment methods
      const eligiblePayments = pembayarans.filter(p => p.metodePembayaran !== 'TUNAI');

      for (const pembayaran of eligiblePayments) {
        // Map payment status to Xendit status
        let xenditStatus;
        switch (pembayaran.statusPembayaran) {
          case 'PAID':
          case 'SETTLED':
            xenditStatus = pembayaran.statusPembayaran;
            break;
          case 'EXPIRED':
            xenditStatus = 'EXPIRED';
            break;
          default:
            xenditStatus = 'PENDING';
        }

        // Create Xendit payment record
        const externalId = `INV-${faker.string.alphanumeric(10)}`;
        const invoiceId = `xnd_inv_${faker.string.alphanumeric(16)}`;

        const xenditPayment = await xenditPaymentFactory.with({
          pembayaranId: pembayaran.id,
          xenditInvoiceId: invoiceId,
          xenditExternalId: externalId,
          xenditPaymentUrl: `https://checkout.xendit.co/web/${faker.string.alphanumeric(12)}`,
          xenditPaymentChannel: mapPaymentMethodToChannel(pembayaran.metodePembayaran),
          xenditExpireDate: faker.date.future(0.1).toISOString(),
          xenditPaidAt: xenditStatus === 'PAID' || xenditStatus === 'SETTLED'
            ? faker.date.recent(5).toISOString()
            : null,
          xenditStatus
        }).createOne();

        xenditPayments.push(xenditPayment);

        // Create callback record for some payments (70% chance)
        if (faker.datatype.boolean(0.7)) {
          const eventType = `invoice.${xenditStatus.toLowerCase()}`;

          const xenditCallback = await xenditCallbackInvoiceFactory.with({
            xenditPaymentId: xenditPayment.id,
            eventType,
            amount: parseFloat(pembayaran.jumlahTagihan),
            status: xenditStatus
          }).createOne();

          xenditCallbacks.push(xenditCallback);
        }
      }

      logger.info(`Created ${xenditPayments.length} Xendit payment records and ${xenditCallbacks.length} Xendit callback records`);

      return xenditPayments;
    } catch (error) {
      logger.error('Error seeding Xendit payments:', error);
      throw error;
    }
  }
}

// Helper function to map payment method to Xendit channel
function mapPaymentMethodToChannel(method) {
  switch (method) {
    case 'VIRTUAL_ACCOUNT':
      return 'BANK_TRANSFER';
    case 'EWALLET':
      return faker.helpers.arrayElement(['GOPAY', 'OVO', 'DANA']);
    case 'RETAIL_OUTLET':
      return faker.helpers.arrayElement(['ALFAMART', 'INDOMARET']);
    case 'CREDIT_CARD':
      return 'CREDIT_CARD';
    case 'QR_CODE':
      return 'QRIS';
    default:
      return 'BANK_TRANSFER';
  }
}

module.exports = XenditPaymentSeeder;