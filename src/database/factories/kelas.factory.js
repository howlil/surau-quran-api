const BaseFactory = require('./base.factory');

class KelasFactory extends BaseFactory {
  constructor() {
    super('kelas');
  }

  definition() {
    const namaKelas = this.faker.helpers.arrayElement([
      'Makkah', 'Madinah', 'Alaqsa', 'Pustaka', 'Nabawi', 'Shafa', 'Marwah', 'Private'
    ]);
    
    return {
      namaKelas,
    };
  }
}

module.exports = new KelasFactory();