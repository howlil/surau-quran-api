const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const PasswordUtils = require('../../lib/utils/password.utils');

class AdminSeeder {
  static async seed() {
    try {
      const adminEmail = "admin@example.com";
      const adminPassword = "@Test123"; ;
      const adminName = "Admin User"; ;
      
      const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail }
      });
      
      if (existingAdmin) {
        logger.info('Admin user already exists, skipping seeder');
        return;
      }
      
      // Create admin user
      await prisma.$transaction(async (tx) => {
        // Hash password
        const hashedPassword = await PasswordUtils.hash(adminPassword);
        
        // Create user
        const user = await tx.user.create({
          data: {
            email: adminEmail,
            password: hashedPassword,
            role: 'ADMIN'
          }
        });
        
        // Create admin profile
        await tx.admin.create({
          data: {
            userId: user.id,
            nama: adminName
          }
        });
        
        logger.info(`Admin user created with email: ${adminEmail}`);
      });
    } catch (error) {
      logger.error('Failed to seed admin user:', error);
      throw error;
    }
  }
}

module.exports = AdminSeeder;