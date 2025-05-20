const BaseFactory = require('./base.factory');

class AdminFactory extends BaseFactory {
  constructor() {
    super('admin');
  }

  definition() {
    return {
      userId: null, // This needs to be specified when creating
      nama: this.faker.person.fullName(),
    };
  }
}

module.exports = new AdminFactory();