const { logger } = require('../../lib/config/logger.config');
const userFactory = require('../factories/user.factory');
const { prisma } = require('../../lib/config/prisma.config');

class UserSeeder {
  static async seed() {
    try {
      logger.info('Seeding users...');
      
      // Create users individually to handle potential unique constraint conflicts
      const adminUsers = [];
      const guruUsers = [];
      const siswaUsers = [];
      
      // Create admin users (3)
      logger.info('Creating admin users...');
      for (let i = 0; i < 3; i++) {
        try {
          const admin = await userFactory.admin().createOne();
          adminUsers.push(admin);
        } catch (error) {
          if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            logger.warn('Duplicate email generated for admin, retrying...');
            i--; // Retry this iteration
          } else {
            throw error;
          }
        }
      }
      
      // Create guru users (7)
      logger.info('Creating guru users...');
      for (let i = 0; i < 7; i++) {
        try {
          const guru = await userFactory.guru().createOne();
          guruUsers.push(guru);
        } catch (error) {
          if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            logger.warn('Duplicate email generated for guru, retrying...');
            i--; // Retry this iteration
          } else {
            throw error;
          }
        }
      }
      
      // Create siswa users (15)
      logger.info('Creating siswa users...');
      for (let i = 0; i < 15; i++) {
        try {
          const siswa = await userFactory.siswa().createOne();
          siswaUsers.push(siswa);
        } catch (error) {
          if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            logger.warn('Duplicate email generated for siswa, retrying...');
            i--; // Retry this iteration
          } else {
            throw error;
          }
        }
      }
      
      logger.info(`Created ${adminUsers.length} admin users, ${guruUsers.length} guru users, and ${siswaUsers.length} siswa users`);
      
      return {
        adminUsers,
        guruUsers,
        siswaUsers
      };
    } catch (error) {
      logger.error('Error seeding users:', error);
      throw error;
    }
  }
}

module.exports = UserSeeder;