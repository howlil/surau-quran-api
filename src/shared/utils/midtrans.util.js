const midtrans = require("../configs/midtrans.config")
const { logger } = require('../configs/logger.config');
const crypto = require('crypto');


class MidtransUtils {
    #snap
    #iris

    constructor() {
        this.#snap = midtrans.payment()
        this.#iris = midtrans.payout()
    }


    static generateExternalId(prefix = 'TXN') {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `${prefix}-${timestamp}-${random}`;
    }

    async createPayment(data = {}) {
        try {
            return this.#snap.createTransaction(data)
        } catch (error) {
            logger.error(error)
            throw error
        }
    }


    async verifyMidtransWebhook(req) {
        const body = req.body;
        const signatureKey = body.signature_key;

        if (!signatureKey) {
            return false;
        }

        const orderId = body.order_id;
        const statusCode = body.status_code;
        const grossAmount = body.gross_amount;
        const serverKey = process.env.MIDTRANS_SERVER_KEY;

        const stringToSign = orderId + statusCode + grossAmount + serverKey;
        const signature = crypto.createHash('sha512').update(stringToSign).digest('hex');

        return signature === signatureKey;
    }

}

module.exports = new MidtransUtils()