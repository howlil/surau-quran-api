const BaseFactory = require('./base.factory');
const bcrypt = require('bcrypt');

class UserFactory extends BaseFactory {
  static usedEmails = new Set();
  
  constructor() {
    super('user');
  }

  definition() {
    const roles = ['ADMIN', 'SISWA', 'GURU'];
    const role = this.faker.helpers.arrayElement(roles);
    
    // Generate a unique email
    let email;
    do {
      // Create a unique email by combining:
      // 1. Role prefix
      // 2. Username part (first name + random number)
      // 3. Domain with timestamp suffix for uniqueness
      const prefix = role.toLowerCase().substring(0, 3);
      const firstName = this.faker.person.firstName().toLowerCase();
      const randomNum = this.faker.number.int({min: 1000, max: 9999});
      const timestamp = Date.now().toString().slice(-4);
      
      email = `${prefix}_${firstName}${randomNum}${timestamp}@example.com`.toLowerCase();
    } while (UserFactory.usedEmails.has(email));
    
    // Add the generated email to the used emails set
    UserFactory.usedEmails.add(email);
    
    return {
      email,
      password: bcrypt.hashSync('Password123!', 10),
      role,
    };
  }

  admin() {
    return this.with({ role: 'ADMIN' });
  }

  siswa() {
    return this.with({ role: 'SISWA' });
  }

  guru() {
    return this.with({ role: 'GURU' });
  }
}

module.exports = new UserFactory();