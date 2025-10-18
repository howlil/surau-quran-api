const midtrans = require("../config/midtrans.config")
const { logger } = require('../config/logger.config');


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

    async createBatchPayout(data = {}) {
        try {
            return this.#iris.createPayouts(data)
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    async handleCallback(data = {}) {
        try {
            return this.#snap.transaction.notification(data)

        } catch (error) {
            logger.error(error)
            throw error

        }
    }

}

module.exports = new MidtransUtils();