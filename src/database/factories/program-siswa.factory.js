const BaseFactory = require('./base.factory');

class ProgramSiswaFactory extends BaseFactory {
  constructor() {
    super('programSiswa');
  }

  definition() {
    const status = this.faker.helpers.arrayElement(['AKTIF', 'TIDAK_AKTIF', 'CUTI']);
    
    return {
      siswaId: null, // This needs to be specified
      programId: null, // This needs to be specified
      status,
    };
  }
}

module.exports = new ProgramSiswaFactory();