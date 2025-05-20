const BaseFactory = require('./base.factory');

class VoucherFactory extends BaseFactory {
  static usedCodes = new Set();
  
  constructor() {
    super('voucher');
  }

  definition() {
    const tipe = this.faker.helpers.arrayElement(['PERSENTASE', 'NOMINAL']);
    let nominal;
    
    if (tipe === 'PERSENTASE') {
      nominal = this.faker.number.int({ min: 5, max: 50 });
    } else {
      nominal = this.faker.number.int({ min: 10000, max: 100000 });
    }
    
    // Generate a unique voucher code
    let kodeVoucher;
    do {

      const prefix = tipe === 'PERSENTASE' ? 'PRCNT' : 'FIXD';
      const randomPart = this.faker.string.alpha({ length: 4, casing: 'upper' });
      const timestamp = Date.now().toString().slice(-4);
      
      kodeVoucher = `${prefix}-${randomPart}-${timestamp}`;
    } while (VoucherFactory.usedCodes.has(kodeVoucher));
    
    // Add the generated code to the used codes set
    VoucherFactory.usedCodes.add(kodeVoucher);
    
    return {
      kodeVoucher,
      tipe,
      nominal,
      isActive: this.faker.datatype.boolean(0.8), // 80% are active
      jumlahPenggunaan: this.faker.number.int({ min: 10, max: 100 }),
    };
  }
}

module.exports = new VoucherFactory();