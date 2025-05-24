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

  static generatePhoneNumber() {
    const prefixes = ['0811', '0812', '0813', '0821', '0822', '0823', '0851', '0852', '0853'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `${prefix}${suffix}`;
  }

  static generateEmail(name) {
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const cleanName = name.toLowerCase().replace(/\s+/g, '.');
    const randomNumber = Math.floor(Math.random() * 1000);
    return `${cleanName}${randomNumber}@${domain}`;
  }

  static generateIndonesianName() {
    const firstNames = [
      'Ahmad', 'Muhammad', 'Abdul', 'Siti', 'Nurul', 'Fatimah', 'Khadijah', 'Aisyah',
      'Umar', 'Ali', 'Hasan', 'Husein', 'Zainab', 'Maryam', 'Aminah', 'Hafsah',
      'Yusuf', 'Ibrahim', 'Ismail', 'Musa', 'Isa', 'Daud', 'Sulaiman', 'Yahya'
    ];
    
    const lastNames = [
      'Rahman', 'Rahim', 'Malik', 'Qureshi', 'Ansari', 'Hashim', 'Talib', 'Faruq',
      'Siddiq', 'Farooq', 'Usman', 'Abbas', 'Hasan', 'Husein', 'Zahra', 'Thalib',
      'Hakim', 'Nasir', 'Bashir', 'Amin', 'Karim', 'Latif', 'Majid', 'Rashid'
    ];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }

  static generateAddress() {
    const streets = [
      'Jl. Masjid Raya', 'Jl. Pondok Pesantren', 'Jl. Islamic Center', 'Jl. Madrasah',
      'Jl. Al-Quran', 'Jl. Surau', 'Jl. Musholla', 'Jl. Dakwah', 'Jl. Tabligh'
    ];
    
    const areas = [
      'Padang Utara', 'Padang Selatan', 'Padang Timur', 'Padang Barat',
      'Koto Tangah', 'Nanggalo', 'Pauh', 'Lubuk Kilangan', 'Lubuk Begalung'
    ];
    
    const street = streets[Math.floor(Math.random() * streets.length)];
    const area = areas[Math.floor(Math.random() * areas.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    
    return `${street} No. ${number}, ${area}, Padang, Sumatera Barat`;
  }

  static generateSchoolName() {
    const types = ['SD', 'SMP', 'SMA', 'SMK'];
    const names = [
      'Negeri', 'Islam', 'Muhammadiyah', 'Terpadu', 'Plus', 'Unggulan',
      'Al-Azhar', 'Daar El-Qolam', 'Insan Cendekia', 'Dwi Warna'
    ];
    
    const type = types[Math.floor(Math.random() * types.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    const number = Math.floor(Math.random() * 50) + 1;
    
    return `${type} ${name} ${number} Padang`;
  }

  static generateBankAccount() {
    const banks = [
      { name: 'BCA', code: 'BCA' },
      { name: 'MANDIRI', code: 'MANDIRI' },
      { name: 'BNI', code: 'BNI' },
      { name: 'BRI', code: 'BRI' },
      { name: 'CIMB NIAGA', code: 'CIMB' },
      { name: 'DANAMON', code: 'DANAMON' }
    ];
    
    const bank = banks[Math.floor(Math.random() * banks.length)];
    const accountNumber = Math.floor(Math.random() * 9000000000) + 1000000000;
    
    return {
      bankName: bank.name,
      bankCode: bank.code,
      accountNumber: accountNumber.toString()
    };
  }

  static generateDateRange(startYear = 1990, endYear = 2010) {
    const start = new Date(startYear, 0, 1);
    const end = new Date(endYear, 11, 31);
    const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    
    return randomDate.toISOString().split('T')[0];
  }

  static generateRandomAmount(min = 100000, max = 1000000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static generateVoucherCode(prefix = 'PROMO') {
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    const randomNumber = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${prefix}${randomString}${randomNumber}`;
  }

  static generateExternalId(prefix = 'TXN') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static getRandomItems(array, count) {
    const shuffled = this.shuffleArray(array);
    return shuffled.slice(0, Math.min(count, array.length));
  }

  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

module.exports = DataGeneratorUtils;