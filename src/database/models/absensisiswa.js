'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AbsensiSiswa extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.JadwalSiswa, {
        foreignKey: 'jadwal_siswa_id',
        as: 'jadwal_siswa'
      });
    }
  }
  AbsensiSiswa.init({
    id: DataTypes.UUID,
    jadwal_siswa_id: DataTypes.UUID,
    tanggal: DataTypes.DATE,
    jam_masuk: DataTypes.TIME,
    status_kehadiran: DataTypes.ENUM('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT')
  }, {
    sequelize,
    modelName: 'AbsensiSiswa',
    underscored: true,
  });
  return AbsensiSiswa;
};
