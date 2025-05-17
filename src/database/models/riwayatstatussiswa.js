'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RiwayatStatusSiswa extends Model {
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
    }
  }
  RiwayatStatusSiswa.init({
    id: DataTypes.UUID,
    program_siswa_id: DataTypes.UUID,
    status_lama: DataTypes.ENUM('AKTIF', 'TIDAK_AKTIF', 'CUTI'),
    status_baru: DataTypes.ENUM('AKTIF', 'TIDAK_AKTIF', 'CUTI'),
    tanggal_perubahan: DataTypes.DATE,
    keterangan: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'RiwayatStatusSiswa',
    underscored: true,
  });
  return RiwayatStatusSiswa;
};