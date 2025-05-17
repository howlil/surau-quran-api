'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Pendaftarans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id: {
        type: Sequelize.UUID
      },
      siswa_id: {
        type: Sequelize.UUID
      },
      program_siswa_id: {
        type: Sequelize.UUID
      },
      tanggal_daftar: {
        type: Sequelize.DATE
      },
      biaya_pendaftaran: {
        type: Sequelize.DECIMAL
      },
      voucher_id: {
        type: Sequelize.UUID
      },
      diskon: {
        type: Sequelize.DECIMAL
      },
      total_bayar: {
        type: Sequelize.DECIMAL
      },
      status_verifikasi: {
        type: Sequelize.ENUM('MENUNGGU', 'DIVERIFIKASI')
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Pendaftarans');
  }
};