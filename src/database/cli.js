#!/usr/bin/env node

const DatabaseSeeder = require('./seeder');
const DatabaseReset = require('./reset');
const logger = require('../../lib/config/logger.config');

class DatabaseCLI {
  constructor() {
    this.commands = {
      'seed': this.seed.bind(this),
      'reset': this.reset.bind(this),
      'fresh': this.fresh.bind(this),
      'help': this.help.bind(this)
    };
  }

  async run() {
    const command = process.argv[2] || 'help';
    
    if (this.commands[command]) {
      try {
        await this.commands[command]();
        process.exit(0);
      } catch (error) {
        console.error('❌ Command failed:', error.message);
        process.exit(1);
      }
    } else {
      console.log(`❌ Unknown command: ${command}`);
      this.help();
      process.exit(1);
    }
  }

  async seed() {
    console.log('🌱 Seeding database...');
    const seeder = new DatabaseSeeder();
    await seeder.seed();
    await seeder.disconnect();
  }

  async reset() {
    console.log('🗑️  Resetting database...');
    const reset = new DatabaseReset();
    await reset.reset();
    await reset.disconnect();
  }

  async fresh() {
    console.log('🔄 Fresh database (reset + seed)...');
    const reset = new DatabaseReset();
    const seeder = new DatabaseSeeder();
    
    await reset.reset();
    await reset.disconnect();
    
    await seeder.seed();
    await seeder.disconnect();
  }

  help() {
    console.log(`
📚 Database CLI Commands

Usage: node src/database/cli.js <command>

Commands:
  seed     Seed database with sample data
  reset    Clear all data from all tables
  fresh    Reset database and seed with sample data
  help     Show this help message

Examples:
  node src/database/cli.js seed
  node src/database/cli.js reset
  node src/database/cli.js fresh
    `);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new DatabaseCLI();
  cli.run();
}

module.exports = DatabaseCLI;
