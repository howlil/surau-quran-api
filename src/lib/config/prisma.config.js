const { PrismaClient } = require('@prisma/client');


class PrismaConfig {
  constructor() {
 
    this.prisma = new PrismaClient({
      log: this._getLogLevels(),
    });
  }

  _getLogLevels() {
    if (process.env.NODE_ENV === 'development') {
      return [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ];
    }
    
    return [
      { level: 'error', emit: 'stdout' },
    ];
  }

 
  setupListeners() {
    if (process.env.NODE_ENV === 'development') {
      this.prisma.$on('query', (e) => {
        console.log(`Query: ${e.query}`);
        console.log(`Duration: ${e.duration}ms`);
      });
    }
  }


  async connect() {
    try {
      await this.prisma.$connect();
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      process.exit(1);
    }
  }


  async disconnect() {
    await this.prisma.$disconnect();
    console.log('Database disconnected');
  }

  getClient() {
    return this.prisma;
  }


  async transaction(callback) {
    return this.prisma.$transaction(callback);
  }

  
  static getInstance() {
    if (!PrismaConfig.instance) {
      PrismaConfig.instance = new PrismaConfig();
    }
    return PrismaConfig.instance;
  }
}

PrismaConfig.instance = null;


module.exports = {
  config: PrismaConfig.getInstance(),
  
  prisma: PrismaConfig.getInstance().getClient(),
  
  transaction: async (callback) => {
    return PrismaConfig.getInstance().transaction(callback);
  },
  
  connect: async () => {
    const instance = PrismaConfig.getInstance();
    instance.setupListeners();
    await instance.connect();
  },
  
  disconnect: async () => {
    await PrismaConfig.getInstance().disconnect();
  }
};