'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Payroll extends Model {
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

      // Payroll memiliki satu PayrollDisbursement
      this.hasOne(models.PayrollDisbursement, {
        foreignKey: 'payroll_id',
        as: 'disbursement'
      });
    }
  }
  Payroll.init({
    id: DataTypes.UUID,
    guru_id: DataTypes.UUID,
    bulan: DataTypes.INTEGER,
    tahun: DataTypes.INTEGER,
    total_sks: DataTypes.DECIMAL,
    gaji_pokok: DataTypes.DECIMAL,
    insentif: DataTypes.DECIMAL,
    izin: DataTypes.DECIMAL,
    sakit: DataTypes.DECIMAL,
    absen: DataTypes.DECIMAL,
    total_gaji: DataTypes.DECIMAL,
    tanggal_kalkulasi: DataTypes.DATE,
    status_payroll: DataTypes.ENUM('DRAFT', 'DIPROSES', 'SELESAI', 'GAGAL')
  }, {
    sequelize,
    modelName: 'Payroll',
    underscored: true,
  });
  return Payroll;
};