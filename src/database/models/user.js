'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.hasOne(models.Admin, {
        foreignKey: 'user_id',
        as: 'admin'
      });

      // User memiliki satu Guru
      this.hasOne(models.Guru, {
        foreignKey: 'user_id',
        as: 'guru'
      });

      // User memiliki satu Siswa
      this.hasOne(models.Siswa, {
        foreignKey: 'user_id',
        as: 'siswa'
      });
    }
  }

  User.init({
    id: DataTypes.UUID,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    role: DataTypes.ENUM('ADMIN', 'SISWA', 'GURU')
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};