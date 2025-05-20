const BaseFactory = require('./base.factory');

class GuruFactory extends BaseFactory {
  constructor() {
    super('guru');
  }

  definition() {
    const gender = this.faker.helpers.arrayElement(['LAKI_LAKI', 'PEREMPUAN']);
    
    return {
      userId: null, // This needs to be specified
      nip: this.faker.string.numeric(6),
      nama: this.faker.person.fullName(),
      noWhatsapp: this.faker.helpers.replaceSymbols('+62##########'),
      alamat: this.faker.location.streetAddress(),
      jenisKelamin: gender,
      fotoProfile: this.faker.image.avatar(),
      keahlian: this.faker.helpers.arrayElement(['Tahsin', 'Tahfidz', 'BTA', 'Pre BTA']),
      pendidikanTerakhir: this.faker.helpers.arrayElement(['S1', 'S2', 'S3']),
      noRekening: this.faker.finance.accountNumber(),
      namaBank: this.faker.helpers.arrayElement(['BCA', 'BNI', 'BRI', 'Mandiri']),
      tarifPerJam: parseFloat(this.faker.finance.amount(50000, 200000, 0)),
      suratKontrak: null,
    };
  }
}

module.exports = new GuruFactory();