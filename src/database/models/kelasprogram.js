'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class KelasProgram extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.Kelas, {
        foreignKey: 'kelas_id',
        as: 'kelas'
      });

      // KelasProgram dimiliki oleh satu Program
      this.belongsTo(models.Program, {
        foreignKey: 'program_id',
        as: 'program'
      });

      // KelasProgram dimiliki oleh satu JamMengajar
      this.belongsTo(models.JamMengajar, {
        foreignKey: 'jam_id',
        as: 'jam_mengajar'
      });

      // KelasProgram dimiliki oleh satu Guru
      this.belongsTo(models.Guru, {
        foreignKey: 'guru_id',
        as: 'guru'
      });

      // KelasProgram memiliki banyak JadwalSiswa
      this.hasMany(models.JadwalSiswa, {
        foreignKey: 'kelas_program_id',
        as: 'jadwal_siswa'
      });

      // KelasProgram memiliki banyak AbsensiGuru
      this.hasMany(models.AbsensiGuru, {
        foreignKey: 'kelas_program_id',
        as: 'absensi_guru'
      });
    }
  }
  KelasProgram.init({
    id: DataTypes.UUID,
    kelas_id: DataTypes.UUID,
    program_id: DataTypes.UUID,
    hari: DataTypes.ENUM('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'),
    jam_id: DataTypes.UUID,
    guru_id: DataTypes.UUID,
    tipe_kelas: DataTypes.ENUM('GROUP', 'PRIVATE')
  }, {
    sequelize,
    modelName: 'KelasProgram',
  });
  return KelasProgram;
};