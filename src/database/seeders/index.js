const resetDatabase = require('./reset');
const fakerSeeder = require('./faker.seeder');

async function seed() {
    try {
        console.log('🚀 Starting database reset and seeding process...');

        console.log('Step 1: Resetting database...');
        await resetDatabase();
        console.log('✅ Database reset completed');

        console.log('Step 2: Seeding with faker data...');
        await fakerSeeder.seed();
        console.log('✅ Faker seeding completed');

        console.log('🎉 Database reset and seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to seed database:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the seeding process
console.log('Database Seeder');
console.log('===============');
seed(); 