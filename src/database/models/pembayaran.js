'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Pembayaran extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.hasOne(models.XenditPayment, {
        foreignKey: 'pembayaran_id',
        as: 'xendit_payment'
      });
    }
  }
  Pembayaran.init({
    id: DataTypes.UUID,
    tipe_pembayaran: DataTypes.ENUM('PENDAFTARAN', 'SPP'),
    referensi_id: DataTypes.STRING,
    metode_pembayaran: DataTypes.ENUM('TUNAI', 'VIRTUAL_ACCOUNT', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QRIS'),
    jumlah: DataTypes.DECIMAL,
    status_pembayaran: DataTypes.ENUM('PENDING', 'MENUNGGU_PEMBAYARAN', 'LUNAS', 'BELUM_BAYAR', 'KADALUARSA', 'DIBATALKAN'),
    tanggal_pembayaran: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Pembayaran',
    underscored: true,
  });
  return Pembayaran;
};