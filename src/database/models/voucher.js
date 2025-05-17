'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Voucher extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.hasMany(models.Pendaftaran, {
        foreignKey: 'voucher_id',
        as: 'pendaftaran'
      });

      // Voucher memiliki banyak PeriodeSPP
      this.hasMany(models.PeriodeSPP, {
        foreignKey: 'voucher_id',
        as: 'periode_spp'
      });
    }
  }
  Voucher.init({
    id: DataTypes.UUID,
    kode: DataTypes.STRING,
    tipe_voucher: DataTypes.ENUM('PERSENTASE', 'NOMINAL'),
    nilai: DataTypes.DECIMAL,
    jumlah_terpakai: DataTypes.INTEGER,
    is_active: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Voucher',
    underscored: true,
  });
  return Voucher;
};