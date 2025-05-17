'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class JadwalSiswa extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.ProgramSiswa, {
        foreignKey: 'program_siswa_id',
        as: 'program_siswa'
      });

      // JadwalSiswa dimiliki oleh satu KelasProgram
      this.belongsTo(models.KelasProgram, {
        foreignKey: 'kelas_program_id',
        as: 'kelas_program'
      });

      // JadwalSiswa memiliki banyak AbsensiSiswa
      this.hasMany(models.AbsensiSiswa, {
        foreignKey: 'jadwal_siswa_id',
        as: 'absensi'
      });
    }
  }
  JadwalSiswa.init({
    id: DataTypes.UUID,
    program_siswa_id: DataTypes.UUID,
    kelas_program_id: DataTypes.UUID
  }, {
    sequelize,
    modelName: 'JadwalSiswa',
    underscored: true,
  });
  return JadwalSiswa;
};