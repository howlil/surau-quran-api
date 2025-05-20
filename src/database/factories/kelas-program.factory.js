const BaseFactory = require('./base.factory');

class KelasProgramFactory extends BaseFactory {
  constructor() {
    super('kelasProgram');
  }

  definition() {
    const hari = this.faker.helpers.arrayElement(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']);
    const tipeKelas = this.faker.helpers.arrayElement(['Grup', 'Private']);
    
    return {
      kelasId: null, // This needs to be specified
      programId: null, // This needs to be specified
      jamMengajarId: null, // This needs to be specified
      hari,
      guruId: null, // This needs to be specified
      tipeKelas,
    };
  }
}

module.exports = new KelasProgramFactory();