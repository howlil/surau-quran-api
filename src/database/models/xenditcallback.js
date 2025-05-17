'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class XenditCallback extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  XenditCallback.init({
    id: DataTypes.UUID,
    callback_type: DataTypes.ENUM('INVOICE', 'DISBURSEMENT', 'VIRTUAL_ACCOUNT'),
    reference_id: DataTypes.STRING,
    reference_type: DataTypes.ENUM('PEMBAYARAN', 'DISBURSEMENT'),
    event_type: DataTypes.STRING,
    status: DataTypes.STRING,
    amount: DataTypes.DECIMAL,
    raw_response: DataTypes.JSON
  }, {
    sequelize,
    modelName: 'XenditCallback',
    underscored: true,
  });
  return XenditCallback;
};