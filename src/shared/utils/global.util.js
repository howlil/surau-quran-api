require('dotenv').config();

class GlobalUtil {
    static isDevelopment = process.env.NODE_ENV === 'development';

    isDevelopment() {
        return GlobalUtil.isDevelopment;
    }
}

module.exports = new GlobalUtil();