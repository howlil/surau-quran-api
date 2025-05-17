const { logger } = require('../../lib/config/logger.config');
const AdminSeeder = require('./admin.seed');

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');
    
    await AdminSeeder.seed();
   
    
    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  
  const { prismaConfig } = require('../../lib/config/prisma.config');
  
  prismaConfig.connect()
    .then(() => seedDatabase())
    .then(() => prismaConfig.disconnect())
    .then(() => {
      logger.info('Seed process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed process failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;