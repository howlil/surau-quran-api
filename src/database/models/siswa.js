'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Siswa extends Model {

    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });

      // Siswa memiliki banyak ProgramSiswa
      this.hasMany(models.ProgramSiswa, {
        foreignKey: 'siswa_id',
        as: 'program_siswa'
      });

      // Siswa memiliki satu Pendaftaran
      this.hasOne(models.Pendaftaran, {
        foreignKey: 'siswa_id',
        as: 'pendaftaran'
      });
    }
  }
  Siswa.init({
    id: DataTypes.UUID,
    user_id: DataTypes.UUID,
    no_whatsapp: DataTypes.STRING,
    nama_murid: DataTypes.STRING,
    nama_panggilan: DataTypes.STRING,
    tanggal_lahir: DataTypes.DATE,
    jenis_kelamin: DataTypes.ENUM('LAKI_LAKI', 'PEREMPUAN'),
    alamat: DataTypes.STRING,
    strata_pendidikan: DataTypes.ENUM('PAUD', 'TK', 'SD', 'SMP', 'SMA', 'KULIAH', 'UMUM'),
    kelas_sekolah: DataTypes.STRING,
    nama_sekolah: DataTypes.STRING,
    nama_orang_tua: DataTypes.STRING,
    nama_penjemput: DataTypes.STRING,
    is_registered: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Siswa',
  });
  return Siswa;
};