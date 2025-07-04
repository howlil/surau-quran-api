const moment = require('moment');
const { DATE_FORMATS } = require('../constants');

class DataGeneratorUtils {

  static generatePassword(length = 8) {
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const allChars = lowerChars + upperChars + numbers + specialChars;
    let password = '';

    // Ensure the password has at least one character from each category
    password += lowerChars.charAt(Math.floor(Math.random() * lowerChars.length));
    password += upperChars.charAt(Math.floor(Math.random() * upperChars.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));

    // Fill the rest of the password
    for (let i = 4; i < length; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Shuffle the password to make it more random
    password = password.split('').sort(() => 0.5 - Math.random()).join('');

    return password;
  }

  static generateStudentId(sequenceNumber) {
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = sequenceNumber.toString().padStart(4, '0');
    return `SQ${year}${sequence}`;
  }


  static generateNIS(existingNISNumbers = []) {
    const currentYear = new Date().getFullYear();
    const yearCode = currentYear.toString().slice(-2);

    // Find the highest existing number for this year
    let maxNumber = 0;
    existingNISNumbers.forEach(nis => {
      if (nis && nis.startsWith(yearCode)) {
        const num = parseInt(nis.slice(2), 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    // Create a new number
    const newNumber = (maxNumber + 1).toString().padStart(4, '0');
    return `${yearCode}${newNumber}`;
  }

  static generateNIP(existingNIPNumbers = []) {
    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-2);

    const existingSequences = existingNIPNumbers
      .filter(nip => nip && nip.startsWith(yearSuffix))
      .map(nip => parseInt(nip.slice(-4)))
      .filter(seq => !isNaN(seq))
      .sort((a, b) => b - a);

    const nextSequence = existingSequences.length > 0 ? existingSequences[0] + 1 : 1;

    return `${yearSuffix}${nextSequence.toString().padStart(4, '0')}`;
  }

  static generateRandomPassword(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
  }

  static generateSecurePassword(length = 12) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';

    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  static generateStudentPassword(namaPanggilan, tanggalLahir) {
    if (!namaPanggilan) {
      throw new Error('Nama panggilan harus diisi');
    }

    let day = '01'; // Default fallback day

    // If tanggalLahir is provided, try to parse it
    if (tanggalLahir) {
      // Try multiple date formats
      const formats = [
        DATE_FORMATS.DEFAULT,  // DD-MM-YYYY
        'YYYY-MM-DD',          // ISO format
        'MM-DD-YYYY',          // US format
        'DD/MM/YYYY',          // Alternative format
        'YYYY/MM/DD'           // Alternative ISO format
      ];

      let birthDate = null;
      let usedFormat = null;

      // Try each format until one works
      for (const format of formats) {
        const testDate = moment(tanggalLahir, format, true);
        if (testDate.isValid()) {
          birthDate = testDate;
          usedFormat = format;
          break;
        }
      }

      // If we successfully parsed the date, use the actual day
      if (birthDate) {
        day = birthDate.date().toString().padStart(2, '0');
        console.log(`Successfully parsed date "${tanggalLahir}" using format "${usedFormat}" -> day: ${day}`);
      } else {
        console.warn(`Failed to parse birth date "${tanggalLahir}", using fallback day: ${day}`);
      }
    } else {
      console.warn(`Birth date not provided, using fallback day: ${day}`);
    }

    const cleanNickname = namaPanggilan.toLowerCase().replace(/\s+/g, '');

    return `${cleanNickname}${day}`;
  }
}

module.exports = DataGeneratorUtils;