const moment = require('moment');
const ErrorFactory = require('../factories/error.factory');


class CommonServiceUtils {

    static cleanString(str) {
        if (!str) return str;
        return str.trim().replace(/\s+/g, ' ');
    }

    static generateRandomNumber(length = 6) {
        const randomNumber = Math.floor(Math.random() * Math.pow(10, length));
        return randomNumber.toString().padStart(length, '0');
    }

    static generateNIS(randomLength = 3) {
        const currentYear = new Date().getFullYear();
        const randomNumber = this.generateRandomNumber(randomLength);
        return `${currentYear}${randomNumber}`;
    }


    static formatDate(date, format = "DD-MM-YYY") {
        return moment(date).format(format);
    }


    static getCurrentDate(format = "DD-MM-YYY") {
        return moment().format(format);
    }

    static parseMonthYearFilter(monthYear) {
        if (!monthYear) {
            const now = new Date();
            return {
                bulan: String(now.getMonth() + 1).padStart(2, '0'),
                tahun: now.getFullYear()
            };
        }

        const [bulan, tahun] = monthYear.split('-').map(num => parseInt(num));

        if (isNaN(bulan) || isNaN(tahun) || bulan < 1 || bulan > 12) {
            throw ErrorFactory.badRequest('Format filter bulan-tahun tidak valid. Gunakan format MM-YYYY');
        }

        return {
            bulan: String(bulan).padStart(2, '0'),
            tahun: tahun
        };
    }


    static convertDateForDatabase(date) {
        return moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD');
    }


    static validateDateRange(startDate, endDate) {
        if (!startDate) {
            throw ErrorFactory.badRequest('Start date is required');
        }

        const startDateFormatted = this.convertDateForDatabase(startDate);
        const endDateFormatted = endDate ? this.convertDateForDatabase(endDate) : null;

        if (endDateFormatted && startDateFormatted > endDateFormatted) {
            throw ErrorFactory.badRequest('Start date cannot be after end date');
        }

        return {
            startDateFormatted,
            endDateFormatted
        };
    }


    static isDateInPast(date) {
        const dateToCheck = moment(date, 'DD-MM-YYYY');
        const today = moment().startOf('day');
        return dateToCheck.isBefore(today);
    }

    static getDayNameIndonesian(date) {
        const dayNames = {
            0: 'MINGGU',
            1: 'SENIN',
            2: 'SELASA',
            3: 'RABU',
            4: 'KAMIS',
            5: 'JUMAT',
            6: 'SABTU'
        };

        const dayIndex = moment(date, 'DD-MM-YYYY').day();
        return dayNames[dayIndex];
    }

    static generateExternalId(prefix, id) {
        const timestamp = moment().format('YYYYMMDDHHmmss');
        return `${prefix}-${id}-${timestamp}`;
    }


    static validateRequiredFields(data, requiredFields) {
        const missingFields = requiredFields.filter(field => !data[field]);

        if (missingFields.length > 0) {
            throw ErrorFactory.badRequest(`Field yang wajib diisi: ${missingFields.join(', ')}`);
        }
    }


    static validateMaxValue(value, limit, fieldName) {
        if (value > limit) {
            throw ErrorFactory.badRequest(`${fieldName} tidak boleh melebihi ${limit}`);
        }
    }


    static validateMinValue(value, min, fieldName) {
        if (value < min) {
            throw ErrorFactory.badRequest(`${fieldName} tidak boleh kurang dari ${min}`);
        }
    }


    static validateArray(arr, fieldName) {
        if (!Array.isArray(arr) || arr.length === 0) {
            throw ErrorFactory.badRequest(`${fieldName} harus berupa array dan tidak boleh kosong`);
        }
    }

    static getRandomIndex(arrayLength) {
        return Math.floor(Math.random() * arrayLength);
    }


    static calculatePercentage(value, total, decimals = 2) {
        if (total === 0) return 0;
        return Number(((value / total) * 100).toFixed(decimals));
    }


    static roundNumber(number, decimals = 2) {
        return Number(Number(number).toFixed(decimals));
    }


    static isSameDay(date1, date2) {
        return moment(date1, 'DD-MM-YYYY').isSame(moment(date2, 'DD-MM-YYYY'), 'day');
    }


    static getCurrentMonthRange() {
        const startOfMonth = moment().startOf('month');
        const endOfMonth = moment().endOf('month');

        return {
            startDate: startOfMonth.format("DD-MM-YYY"),
            endDate: endOfMonth.format("DD-MM-YYY"),
            startDateFormatted: startOfMonth.format('YYYY-MM-DD'),
            endDateFormatted: endOfMonth.format('YYYY-MM-DD')
        };
    }

    static addDays(date, days, format = "DD-MM-YYY") {
        return moment(date, 'DD-MM-YYYY').add(days, 'days').format(format);
    }


    static getDaysDifference(date1, date2) {
        return moment(date2, 'DD-MM-YYYY').diff(moment(date1, 'DD-MM-YYYY'), 'days');
    }

    static calculateTotalPages(totalItems, limit) {
        return Math.ceil(totalItems / limit);
    }

    
    static safeNumber(value, defaultValue = 0) {
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
    }

   
    static safeRound(value, decimals = 2, maxValue = Number.MAX_SAFE_INTEGER) {
        const rounded = Number(value.toFixed(decimals));
        return Math.min(Math.max(rounded, 0), maxValue);
    }

 
    static safePercentage(value, total, decimals = 2) {
        if (total === 0) return 0;
        return Number(((value / total) * 100).toFixed(decimals));
    }

  
    static generateRandomToken(length = 32) {
        const crypto = require('crypto');
        return crypto.randomBytes(length).toString('hex');
    }

 
    static getMonthNumber(monthName) {
        const months = {
            'JANUARI': 1, 'FEBRUARI': 2, 'MARET': 3, 'APRIL': 4,
            'MEI': 5, 'JUNI': 6, 'JULI': 7, 'AGUSTUS': 8,
            'SEPTEMBER': 9, 'OKTOBER': 10, 'NOVEMBER': 11, 'DESEMBER': 12
        };
        return months[monthName.toUpperCase()] || 1;
    }

    static validateDateFormat(date, format = 'DD-MM-YYYY') {
        const dateObj = moment(date, format);
        if (!dateObj.isValid()) {
            throw ErrorFactory.badRequest('Format tanggal tidak valid');
        }
        return dateObj;
    }


    static isToday(date, format = 'DD-MM-YYYY') {
        const dateToCheck = moment(date, format);
        const today = moment().startOf('day');
        return dateToCheck.isSame(today, 'day');
    }

   
    static isPastDate(date, format = 'DD-MM-YYYY') {
        const dateToCheck = moment(date, format);
        const today = moment().startOf('day');
        return dateToCheck.isBefore(today);
    }

   
    static isFutureDate(date, format = 'DD-MM-YYYY') {
        const dateToCheck = moment(date, format);
        const today = moment().startOf('day');
        return dateToCheck.isAfter(today);
    }

    static getCurrentMonthYear() {
        const now = moment();
        return {
            bulan: now.format('MM'),
            tahun: now.year(),
            bulanTahun: now.format('MM-YYYY')
        };
    }

  
    static formatCurrency(amount, currency = 'IDR') {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

 
    static calculateDiscount(originalPrice, discountPercentage) {
        return Math.round(originalPrice * (discountPercentage / 100));
    }

   
    static calculateDiscountedPrice(originalPrice, discountAmount) {
        return Math.max(0, originalPrice - discountAmount);
    }
}

module.exports = CommonServiceUtils;
