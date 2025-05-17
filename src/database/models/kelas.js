'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Kelas extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.hasMany(models.KelasProgram, {
        foreignKey: 'kelas_id',
        as: 'kelas_program'
      });
    }
  }
  Kelas.init({
    id: DataTypes.UUID,
    nama_kelas: DataTypes.ENUM('MAKKAH', 'MADINAH', 'ALAQSA', 'PUSTAKA', 'NABAWI', 'SHAFA', 'MARWAH', 'PRIVATE', 'TAHSIN', 'TAHFIDZ')
  }, {
    sequelize,
    modelName: 'Kelas',
  });
  return Kelas;
};