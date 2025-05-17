'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PeriodeSPP extends Model {
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

      // PeriodeSPP dimiliki oleh satu Voucher (optional)
      this.belongsTo(models.Voucher, {
        foreignKey: 'voucher_id',
        as: 'voucher'
      });
    }
  }
  PeriodeSPP.init({
    id: DataTypes.UUID,
    program_siswa_id: DataTypes.UUID,
    bulan: DataTypes.INTEGER,
    tahun: DataTypes.INTEGER,
    tanggal_tagihan: DataTypes.DATE,
    tanggal_jatuh_tempo: DataTypes.DATE,
    jumlah_tagihan: DataTypes.DECIMAL,
    voucher_id: DataTypes.UUID,
    diskon: DataTypes.DECIMAL,
    total_bayar: DataTypes.DECIMAL
  }, {
    sequelize,
    modelName: 'PeriodeSPP',
    underscored: true,
  });
  return PeriodeSPP;
};