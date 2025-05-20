require('dotenv').config();
const { logger } = require('../../lib/config/logger.config');
const { prisma } = require('../../lib/config/prisma.config');
const CustomAccountsSeeder = require('./custom-accounts.seeder');

async function seedCustomAccounts() {
    try {
        logger.info('Starting custom accounts seeding...');

        const customAccounts = await CustomAccountsSeeder.seed();

        logger.info('Custom accounts seeding completed successfully');
        logger.info('--------------------------------------------------');
        logger.info('Custom accounts created:');
        logger.info('--------------------------------------------------');
        logger.info('ADMIN Account:');
        logger.info('Email: admin@example.com');
        logger.info('Password: @Test123');
        logger.info('--------------------------------------------------');
        logger.info('GURU Account:');
        logger.info('Email: guru@example.com');
        logger.info('Password: @Test123');
        logger.info('--------------------------------------------------');
        logger.info('SISWA Account:');
        logger.info('Email: siswa@example.com');
        logger.info('Password: @Test123');
        logger.info('--------------------------------------------------');

        return customAccounts;
    } catch (error) {
        logger.error('Error seeding custom accounts:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seeder if this script is executed directly
if (require.main === module) {
    seedCustomAccounts()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Seeding custom accounts failed:', error);
            process.exit(1);
        });
}

module.exports = seedCustomAccounts; 