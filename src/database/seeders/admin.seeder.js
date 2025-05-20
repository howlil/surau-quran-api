const { logger } = require('../../lib/config/logger.config');
const adminFactory = require('../factories/admin.factory');

class AdminSeeder {
  static async seed(adminUsers) {
    try {
      logger.info('Seeding admins...');
      
      // Create admin profiles for each admin user
      const admins = await Promise.all(
        adminUsers.map(user => 
          adminFactory.with({ userId: user.id }).createOne()
        )
      );
      
      logger.info(`Created ${admins.length} admin profiles`);
      
      return admins;
    } catch (error) {
      logger.error('Error seeding admins:', error);
      throw error;
    }
  }
}

module.exports = AdminSeeder;