const { faker } = require('@faker-js/faker');
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');

class BaseFactory {
  constructor(model) {
    this.model = model;
    this.faker = faker;
    this.count = 1;
    this.data = [];
    this.overrides = {};
  }

  times(count) {
    this.count = count;
    return this;
  }

  with(overrides) {
    this.overrides = { ...this.overrides, ...overrides };
    return this;
  }

  makeOne() {
    return { ...this.definition(), ...this.overrides };
  }

  make() {
    this.data = Array.from({ length: this.count }, () => this.makeOne());
    return this.data;
  }

  async createOne() {
    const data = this.makeOne();
    try {
      return await prisma[this.model].create({ data });
    } catch (error) {
      // Log the error with specific model and data details
      logger.error(`Error creating ${this.model}: ${error.message}`);
      throw error;
    }
  }

  async create() {
    if (!this.data.length) {
      this.make();
    }
    
    try {
      // Try to create all records in a transaction
      return await prisma.$transaction(
        this.data.map(item => 
          prisma[this.model].create({ data: item })
        )
      );
    } catch (error) {
      // If the batch creation fails due to a unique constraint
      // Try to create records individually to identify problematic records
      if (error.code === 'P2002') {
        logger.warn(`Unique constraint error in batch creation for ${this.model}. Attempting individual creation...`);
        
        const results = [];
        for (const item of this.data) {
          try {
            const result = await prisma[this.model].create({ data: item });
            results.push(result);
          } catch (individualError) {
            logger.warn(`Failed to create individual ${this.model} record: ${individualError.message}`);
            // Continue with other records
          }
        }
        
        if (results.length > 0) {
          logger.info(`Successfully created ${results.length} out of ${this.data.length} ${this.model} records`);
          return results;
        }
      }
      
      // If no records were created or error wasn't a unique constraint, rethrow
      throw error;
    }
  }

  definition() {
    throw new Error('Method definition() must be implemented by subclass');
  }
}

module.exports = BaseFactory;