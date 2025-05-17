'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PayrollDisbursement extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.Payroll, {
        foreignKey: 'payroll_id',
        as: 'payroll'
      });
    }
  }
  PayrollDisbursement.init({
    id: DataTypes.UUID,
    payroll_id: DataTypes.UUID,
    xendit_disbursement_id: DataTypes.STRING,
    amount: DataTypes.DECIMAL,
    status: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED'),
    tanggal_proses: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'PayrollDisbursement',
    underscored: true,
  });
  return PayrollDisbursement;
};