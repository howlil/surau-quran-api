/**
 * Utility functions for generating various types of data
 */
class DataGeneratorUtils {
  /**
   * Generate a secure random password
   * @param {number} length - Length of the password (default: 8)
   * @returns {string} - Generated password
   */
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

  /**
   * Generate a student ID based on year and a sequence number
   * @param {number} sequenceNumber - Sequence number for the student
   * @returns {string} - Generated student ID
   */
  static generateStudentId(sequenceNumber) {
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = sequenceNumber.toString().padStart(4, '0');
    return `SQ${year}${sequence}`;
  }

  /**
   * Generate a NIS (Nomor Induk Siswa) based on year and a unique number
   * @param {Array} existingNISNumbers - Array of existing NIS numbers to avoid duplicates
   * @returns {string} - Generated NIS
   */
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
}

module.exports = DataGeneratorUtils;