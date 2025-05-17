'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ProgramSiswa extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.Siswa, {
        foreignKey: 'siswa_id',
        as: 'siswa'
      });

      // ProgramSiswa dimiliki oleh satu Program
      this.belongsTo(models.Program, {
        foreignKey: 'program_id',
        as: 'program'
      });

      // ProgramSiswa memiliki satu JadwalSiswa
      this.hasOne(models.JadwalSiswa, {
        foreignKey: 'program_siswa_id',
        as: 'jadwal'
      });

      // ProgramSiswa memiliki satu Pendaftaran
      this.hasOne(models.Pendaftaran, {
        foreignKey: 'program_siswa_id',
        as: 'pendaftaran'
      });

      // ProgramSiswa memiliki banyak PeriodeSPP
      this.hasMany(models.PeriodeSPP, {
        foreignKey: 'program_siswa_id',
        as: 'periode_spp'
      });

      // ProgramSiswa memiliki banyak RiwayatStatusSiswa
      this.hasMany(models.RiwayatStatusSiswa, {
        foreignKey: 'program_siswa_id',
        as: 'riwayat_status'
      });
    }
  }
  ProgramSiswa.init({
    id: DataTypes.UUID,
    siswa_id: DataTypes.UUID,
    program_id: DataTypes.UUID,
    status: DataTypes.ENUM('AKTIF', 'TIDAK_AKTIF', 'CUTI')
  }, {
    sequelize,
    modelName: 'ProgramSiswa',
    underscored: true,
  });
  return ProgramSiswa;
};