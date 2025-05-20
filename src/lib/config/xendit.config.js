class XenditConfig {
  #baseURL;
  #secretKey;
  #callbackToken;
  static #instance;

  constructor() {
  this.#secretKey = process.env.XENDIT_SECRET_KEY;
    this.#callbackToken = process.env.XENDIT_CALLBACK_TOKEN;
    this.#baseURL = process.env.XENDIT_URL ;
    
    if (!this.#secretKey) {
      throw new Error('XENDIT_SECRET_KEY is required');
    }

    if (!this.#callbackToken) {
      throw new Error('XENDIT_CALLBACK_TOKEN is required');
    }
  }

  getAxiosConfig() {
    return {
      timeout: 10000,
      auth: {
        username: this.#secretKey,
        password: ''
      },
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }

  getBaseURL() {
    return this.#baseURL;
  }

  getCallbackToken() {
    return this.#callbackToken;
  }

  validateCallbackToken(token) {
    return token === this.#callbackToken;
  }

  static getInstance() {
    if (!XenditConfig.#instance) {
      XenditConfig.#instance = new XenditConfig();
    }
    return XenditConfig.#instance;
  }
}

module.exports = {
  xenditConfig: XenditConfig.getInstance()
};