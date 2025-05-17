'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Program extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.hasMany(models.KelasProgram, {
        foreignKey: 'program_id',
        as: 'kelas_program'
      });

      // Program memiliki banyak ProgramSiswa
      this.hasMany(models.ProgramSiswa, {
        foreignKey: 'program_id',
        as: 'program_siswa'
      });
    }
  }
  Program.init({
    id: DataTypes.UUID,
    nama_program: DataTypes.ENUM('PRE_BTA', 'BTA_LVL_1', 'BTA_LVL_2', 'TAHSIN', 'TAHFIDZ', 'PRIVATE')
  }, {
    sequelize,
    modelName: 'Program',
  });
  return Program;
};