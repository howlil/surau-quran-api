'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AbsensiGuru extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.Guru, {
        foreignKey: 'guru_id',
        as: 'guru'
      });

      // AbsensiGuru dimiliki oleh satu KelasProgram
      this.belongsTo(models.KelasProgram, {
        foreignKey: 'kelas_program_id',
        as: 'kelas_program'
      });
    }
  }
  AbsensiGuru.init({
    id: DataTypes.UUID,
    guru_id: DataTypes.UUID,
    kelas_program_id: DataTypes.UUID,
    tanggal: DataTypes.DATE,
    jam_masuk: DataTypes.TIME,
    jam_keluar: DataTypes.TIME,
    sks: DataTypes.DECIMAL,
    status_kehadiran: DataTypes.ENUM('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT'),
    surat_izin: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'AbsensiGuru',
    underscored: true,
  });
  return AbsensiGuru;
};