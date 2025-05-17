'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Pendaftaran extends Model {
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

      // Pendaftaran dimiliki oleh satu ProgramSiswa
      this.belongsTo(models.ProgramSiswa, {
        foreignKey: 'program_siswa_id',
        as: 'program_siswa'
      });

      // Pendaftaran dimiliki oleh satu Voucher (optional)
      this.belongsTo(models.Voucher, {
        foreignKey: 'voucher_id',
        as: 'voucher'
      });
    }
  }
  Pendaftaran.init({
    id: DataTypes.UUID,
    siswa_id: DataTypes.UUID,
    program_siswa_id: DataTypes.UUID,
    tanggal_daftar: DataTypes.DATE,
    biaya_pendaftaran: DataTypes.DECIMAL,
    voucher_id: DataTypes.UUID,
    diskon: DataTypes.DECIMAL,
    total_bayar: DataTypes.DECIMAL,
    status_verifikasi: DataTypes.ENUM('MENUNGGU', 'DIVERIFIKASI')
  }, {
    sequelize,
    modelName: 'Pendaftaran',
    underscored: true,
  });
  return Pendaftaran;
};