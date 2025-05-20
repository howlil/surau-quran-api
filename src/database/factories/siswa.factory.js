const BaseFactory = require('./base.factory');

class SiswaFactory extends BaseFactory {
  constructor() {
    super('siswa');
  }

  definition() {
    const gender = this.faker.helpers.arrayElement(['LAKI_LAKI', 'PEREMPUAN']);
    const strata = this.faker.helpers.arrayElement(['PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM']);
    
    return {
      userId: null, // This needs to be specified
      noWhatsapp: this.faker.helpers.replaceSymbols('+62##########'),
      namaMurid: this.faker.person.fullName(),
      namaPanggilan: this.faker.person.firstName(),
      tanggalLahir: this.faker.date.birthdate({ min: 5, max: 20, mode: 'age' }).toISOString().split('T')[0],
      jenisKelamin: gender,
      alamat: this.faker.location.streetAddress(),
      strataPendidikan: strata,
      kelasSekolah: strata !== 'UMUM' ? this.faker.helpers.arrayElement(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']) : null,
      namaSekolah: this.faker.company.name(),
      namaOrangTua: this.faker.person.fullName(),
      namaPenjemput: this.faker.person.fullName(),
      isRegistered: true,
    };
  }
}

module.exports = new SiswaFactory();