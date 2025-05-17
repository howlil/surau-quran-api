require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USERNAME ,
    password: process.env.DB_PASSWORD ,
    database: process.env.DB_NAME ,
    host: process.env.DB_HOST ,
    port: process.env.DB_PORT  ,
    dialect: process.env.DB_DIALECT ,
    logging: console.log,
    dialectOptions: {
      dateStrings: true,
      typeCast: true
    },
    timezone: '+07:00',
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  test: {
    username: process.env.TEST_DB_USERNAME ,
    password: process.env.TEST_DB_PASSWORD ,
    database: process.env.TEST_DB_NAME ,
    host: process.env.TEST_DB_HOST ,
    port: process.env.TEST_DB_PORT ,
    dialect: process.env.DB_DIALECT ,
    logging: false,
    dialectOptions: {
      dateStrings: true,
      typeCast: true
    },
    timezone: '+07:00',
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ,
    dialect: process.env.DB_DIALECT ,
    logging: false,
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    timezone: '+07:00',
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};