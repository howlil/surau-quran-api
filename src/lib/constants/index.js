

const AUTH = {
  JWT_EXPIRES: '30d',
  SALT_ROUNDS: 10,
  ROLES: {
    ADMIN: 'ADMIN',
    GURU: 'GURU',
    SISWA: 'SISWA'
  }
};

const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_REGEX: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/,
  EMAIL_REGEX: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE_REGEX: /^(\+62|62|0)[0-9]{9,12}$/
};

const SECURITY = {
  
  CORS: {
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization'],
  },

};


const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

const DATE_FORMATS = {
  DEFAULT: 'DD-MM-YYYY',
  TIME: 'HH:mm',
  MONTH_YEAR: 'MM YYYY'
};

module.exports = {
  AUTH,
  VALIDATION,
  SECURITY,
  PAGINATION,
  DATE_FORMATS
};