# Database Management Scripts

This directory contains scripts for database management, including seeding and resetting.

## Available Scripts

### Seeding the Database

To add sample data to your database:

```bash
npm run seed
```

This will run the main seeder script without clearing existing data.

### Resetting and Reseeding the Database

To completely clear all data and then reseed the database with fresh data:

```bash
npm run seed:reset
```

This script will:
1. Disable foreign key checks
2. Delete all data from all tables in the correct order to avoid constraint issues
3. Re-enable foreign key checks
4. Run the seed script to add fresh sample data

## Directory Structure

- `seeders/` - Contains all seeding scripts
  - `index.js` - Entry point for the seeding process
  - `main.seeder.js` - Main seeding logic
  - `reset.js` - Script to reset (clear) and reseed the database
  - `utils.js` - Utility functions for the seeding process

## Adding Custom Seeds

To add your own seed data:

1. Modify the `main.seeder.js` file to include your data
2. Make sure to follow the existing patterns and table dependencies

## Table Order

Tables are deleted and seeded in a specific order to respect foreign key relationships. This order is defined in `utils.js` and can be modified if you add new tables or relationships.

## Warning

⚠️ The reset script will delete **ALL** data in your database. Only use it in development or testing environments, never in production. 