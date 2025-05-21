const { prisma } = require('../../lib/config/prisma.config');
const MainSeeder = require('./main.seeder');
const { getTablesInOrder } = require('./utils');

async function resetDatabase() {
    console.log('🗑️  Starting database reset...');

    try {
        // Get table names in the correct order for deletion
        const tableNames = getTablesInOrder('delete');

        console.log(`Found ${tableNames.length} tables to reset in the correct order`);

        // Delete data from all tables in order to handle foreign key constraints
        await prisma.$transaction(async (tx) => {
            // Disable foreign key checks while deleting
            await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

            for (const tableName of tableNames) {
                try {
                    console.log(`Clearing table: ${tableName}`);
                    await tx[tableName].deleteMany({});
                } catch (error) {
                    console.error(`Error clearing table ${tableName}:`, error);
                }
            }

            // Re-enable foreign key checks
            await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
        });

        console.log('✅ All tables cleared successfully.');

        // Run seed after clearing tables
        console.log('🌱 Starting database seeding...');
        await MainSeeder.seed();
        console.log('✅ Database seeded successfully.');

        // Close Prisma connection
        await prisma.$disconnect();
        console.log('🎉 Database reset complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to reset database:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

// Run the reset function
resetDatabase(); 