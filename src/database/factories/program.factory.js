const BaseFactory = require('./base.factory');

class ProgramFactory extends BaseFactory {
  constructor() {
    super('program');
  }

  definition() {
    const namaProgram = this.faker.helpers.arrayElement([
      'Pre BTA', 'BTA LVL 1', 'BTA LVL 2', 'Tahsin', 'Tahfidz', 'Private'
    ]);
    
    return {
      namaProgram,
    };
  }
}

module.exports = new ProgramFactory();