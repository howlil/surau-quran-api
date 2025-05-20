const BaseFactory = require('./base.factory');

class JamMengajarFactory extends BaseFactory {
  constructor() {
    super('jamMengajar');
  }

  definition() {
    const jamMulai = this.faker.helpers.arrayElement(['10:00', '13:00', '15:00', '16:45', '19:00']);
    let jamSelesai;
    
    switch(jamMulai) {
      case '10:00': jamSelesai = '11:45'; break;
      case '13:00': jamSelesai = '14:45'; break;
      case '15:00': jamSelesai = '16:45'; break;
      case '16:45': jamSelesai = '18:30'; break;
      case '19:00': jamSelesai = '20:45'; break;
      default: jamSelesai = '20:00';
    }
    
    return {
      jamMulai,
      jamSelesai,
    };
  }
}

module.exports = new JamMengajarFactory();