class XenditPaymentFactory {
    static create(pembayaranId, statusPembayaran) {
        const externalId = `INV-${Math.random().toString(36).substring(7)}-${Date.now().toString().substring(7)}`;
        const invoiceId = `5f89f55b5b97b70032a8e1d${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        const paymentUrl = `https://checkout.xendit.co/web/${invoiceId}`;
        const paymentChannel = ['BANK_TRANSFER', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QR_CODE'][Math.floor(Math.random() * 5)];

        // Set expire date 24 hours from "now"
        const currentDate = new Date();
        const expireDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);

        // For paid payments, set a paid date
        let paidAt = null;
        if (['PAID', 'SETTLED'].includes(statusPembayaran)) {
            const paidDate = new Date(currentDate.getTime() - Math.floor(Math.random() * 24 * 60 * 60 * 1000));
            paidAt = paidDate.toISOString();
        }

        // Map payment status to Xendit status
        let xenditStatus;
        switch (statusPembayaran) {
            case 'PAID':
            case 'SETTLED':
                xenditStatus = 'PAID';
                break;
            case 'EXPIRED':
                xenditStatus = 'EXPIRED';
                break;
            case 'PENDING':
                xenditStatus = 'PENDING';
                break;
            default:
            xenditStatus = 'PENDING';
        }

        return {
            pembayaranId,
            xenditInvoiceId: invoiceId,
            xenditExternalId: externalId,
            xenditPaymentUrl: paymentUrl,
            xenditPaymentChannel: paymentChannel,
            xenditExpireDate: expireDate.toISOString(),
            xenditPaidAt: paidAt,
            xenditStatus
        };
    }
}

module.exports = XenditPaymentFactory; 