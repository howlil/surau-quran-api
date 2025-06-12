const crypto = require('crypto');

class DataGeneratorUtils {
    static generatePassword(length = 8) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';

        // Ensure at least one of each required character type
        password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[crypto.randomInt(26)]; // Uppercase
        password += 'abcdefghijklmnopqrstuvwxyz'[crypto.randomInt(26)]; // Lowercase
        password += '0123456789'[crypto.randomInt(10)]; // Number
        password += '!@#$%^&*'[crypto.randomInt(8)]; // Special character

        // Fill the rest randomly
        for (let i = password.length; i < length; i++) {
            const randomIndex = crypto.randomInt(charset.length);
            password += charset[randomIndex];
        }

        // Shuffle the password
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    }

    static generateNIS() {
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${year}${random}`;
    }
}

module.exports = DataGeneratorUtils; 