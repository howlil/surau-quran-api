const {Xendit} = require('xendit-node');

class XenditConfig {
  #client;
  static #instance;

  constructor() {
    const secretKey = process.env.XENDIT_SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('XENDIT_SECRET_KEY is required');
    }

    this.#client = new Xendit({
      secretKey,
      xenditURL: process.env.XENDIT_URL,
    });
  }

  getClient() {
    return this.#client;
  }

  static getInstance() {
    if (!XenditConfig.#instance) {
      XenditConfig.#instance = new XenditConfig();
    }
    return XenditConfig.#instance;
  }
}

module.exports = {
  xendit: XenditConfig.getInstance().getClient(),
  xenditConfig: XenditConfig.getInstance()
};