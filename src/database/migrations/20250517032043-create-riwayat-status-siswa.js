'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('RiwayatStatusSiswas', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id: {
        type: Sequelize.UUID
      },
      program_siswa_id: {
        type: Sequelize.UUID
      },
      status_lama: {
        type: Sequelize.ENUM('AKTIF', 'TIDAK_AKTIF', 'CUTI')
      },
      status_baru: {
        type: Sequelize.ENUM('AKTIF', 'TIDAK_AKTIF', 'CUTI')
      },
      tanggal_perubahan: {
        type: Sequelize.DATE
      },
      keterangan: {
        type: Sequelize.TEXT
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
    await queryInterface.dropTable('RiwayatStatusSiswas');
  }
};