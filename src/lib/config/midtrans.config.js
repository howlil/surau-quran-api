const midtransClient = require("midtrans-client")
require("dotenv").config()


class MidtransConfig {
    isProduction = false;
    serverKey = process.env.MIDTRANS_SERVER_KEY
    clientKey = process.env.MIDTRANS_CLIENT_KEY

    constructor() {
        this.errorHandling()
    }

    errorHandling() {
        if (!this.serverKey) throw new Error("MIDTRANS_SERVER_KEY is missing")
        if (!this.clientKey) throw new Error("MIDTRANS_CLIENT_KEY is missing")
    }

    payment() {
        return new midtransClient.Snap({
            isProduction: this.isProduction,
            serverKey: this.serverKey,
            clientKey: this.clientKey
        })
    }

    payout() {
        return new midtransClient.Iris({
            isProduction: this.isProduction,
            serverKey: this.serverKey
        })
    }



}

module.exports = new MidtransConfig() 