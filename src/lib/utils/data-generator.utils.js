class DataGeneratorUtils {
  static generateNIS(existingNISNumbers = []) {
    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-2);
    
    const existingSequences = existingNISNumbers
      .filter(nis => nis && nis.startsWith(yearSuffix))
      .map(nis => parseInt(nis.slice(-4)))
      .filter(seq => !isNaN(seq))
      .sort((a, b) => b - a);

    const nextSequence = existingSequences.length > 0 ? existingSequences[0] + 1 : 1;
    
    return `${yearSuffix}${nextSequence.toString().padStart(4, '0')}`;
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