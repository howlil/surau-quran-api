const moment = require('moment');
const { DATE_FORMATS } = require('../constants');

class FormatUtils {

    static formatDate(date) {
        if (!date) return '';
        return moment(date).format(DATE_FORMATS.DEFAULT);
    }

    static formatTime(time) {
        if (!time) return '';
        return moment(time, 'HH:mm:ss').format(DATE_FORMATS.TIME);
    }

    static formatMonthYear(date) {
        if (!date) return '';
        return moment(date).format(DATE_FORMATS.MONTH_YEAR);
    }

    static parseDate(dateString) {
        if (!dateString) return null;
        return moment(dateString, DATE_FORMATS.DEFAULT).toDate();
    }

    static parseDateToISO(dateString) {
        if (!dateString) return null;
        return moment(dateString, DATE_FORMATS.DEFAULT).format('YYYY-MM-DD');
    }

    static getCurrentDate() {
        return moment().format(DATE_FORMATS.DEFAULT);
    }

    static getCurrentTime() {
        return moment().format(DATE_FORMATS.TIME);
    }

    static getCurrentMonthYear() {
        return moment().format(DATE_FORMATS.MONTH_YEAR);
    }

    static isValidDate(dateString, format = DATE_FORMATS.DEFAULT) {
        return moment(dateString, format, true).isValid();
    }

    static formatCurrency(amount) {
        if (amount === null || amount === undefined) return '';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(amount);
    }

}

module.exports = FormatUtils; 