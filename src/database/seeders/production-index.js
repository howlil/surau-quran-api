const productionSeeder = require('./production.seeder');

async function seedProduction() {
    try {
        console.log('🚀 Starting production seeding process...');
        console.log('=====================================');

        // Run production seeder
        await productionSeeder.seed();

        console.log('=====================================');
        console.log('🎉 Production seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to seed production database:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await productionSeeder.cleanup();
    }
}

// Run the production seeding process
console.log('Production Database Seeder');
console.log('==========================');
seedProduction();
