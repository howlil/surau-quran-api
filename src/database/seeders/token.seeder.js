const { logger } = require('../../lib/config/logger.config');
const tokenFactory = require('../factories/token.factory');
const { faker } = require('@faker-js/faker');

class TokenSeeder {
    static async seed(users) {
        try {
            logger.info('Seeding tokens...');

            // Create tokens for some users (70% chance)
            const selectedUsers = faker.helpers.arrayElements(users, Math.floor(users.length * 0.7));

            const tokens = await Promise.all(
                selectedUsers.map(user =>
                    tokenFactory.with({ userId: user.id }).createOne()
                )
            );

            logger.info(`Created ${tokens.length} token records`);

            return tokens;
        } catch (error) {
            logger.error('Error seeding tokens:', error);
            throw error;
        }
    }
}

module.exports = TokenSeeder;