'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Guru extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });

      // Guru memiliki banyak KelasProgram
      this.hasMany(models.KelasProgram, {
        foreignKey: 'guru_id',
        as: 'kelas_program'
      });

      // Guru memiliki banyak AbsensiGuru
      this.hasMany(models.AbsensiGuru, {
        foreignKey: 'guru_id',
        as: 'absensi'
      });

      // Guru memiliki banyak Payroll
      this.hasMany(models.Payroll, {
        foreignKey: 'guru_id',
        as: 'payroll'
      });
    }
  }
  Guru.init({
    id: DataTypes.UUID,
    user_id: DataTypes.UUID,
    nama: DataTypes.STRING,
    no_whatsapp: DataTypes.STRING,
    alamat: DataTypes.STRING,
    jenis_kelamin: DataTypes.ENUM('LAKI_LAKI', 'PEREMPUAN'),
    foto: DataTypes.STRING,
    keahlian: DataTypes.STRING,
    pendidikan_terakhir: DataTypes.STRING,
    no_rekening: DataTypes.STRING,
    nama_bank: DataTypes.STRING,
    tarif_per_jam: DataTypes.DECIMAL,
    surat_kontrak: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Guru',
  });
  return Guru;
};