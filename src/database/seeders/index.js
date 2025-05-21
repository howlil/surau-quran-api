const MainSeeder = require('./main.seeder');

async function seed() {
    try {
        await MainSeeder.seed();
        process.exit(0);
    } catch (error) {
        console.error('Failed to seed database:', error);
        process.exit(1);
    }
}

seed(); 