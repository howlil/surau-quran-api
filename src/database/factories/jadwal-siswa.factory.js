const BaseFactory = require('./base.factory');

class JadwalSiswaFactory extends BaseFactory {
  constructor() {
    super('jadwalSiswa');
  }

  definition() {
    return {
      programSiswaId: null, // This needs to be specified
      kelasProgramId: null, // This needs to be specified
    };
  }
}

module.exports = new JadwalSiswaFactory();