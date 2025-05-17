'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class XenditPayment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.Pembayaran, {
        foreignKey: 'pembayaran_id',
        as: 'pembayaran'
      });
    }
  }
  XenditPayment.init({
    id: DataTypes.UUID,
    pembayaran_id: DataTypes.UUID,
    xendit_invoice_id: DataTypes.STRING,
    xendit_external_id: DataTypes.STRING,
    xendit_payment_url: DataTypes.STRING,
    xendit_payment_method: DataTypes.STRING,
    xendit_payment_channel: DataTypes.STRING,
    xendit_expiry_date: DataTypes.DATE,
    xendit_paid_at: DataTypes.DATE,
    xendit_status: DataTypes.ENUM('PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'FAILED')
  }, {
    sequelize,
    modelName: 'XenditPayment',
    underscored: true,
  });
  return XenditPayment;
};