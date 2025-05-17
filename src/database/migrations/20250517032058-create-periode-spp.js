'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PeriodeSPPs', {
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
      bulan: {
        type: Sequelize.INTEGER
      },
      tahun: {
        type: Sequelize.INTEGER
      },
      tanggal_tagihan: {
        type: Sequelize.DATE
      },
      tanggal_jatuh_tempo: {
        type: Sequelize.DATE
      },
      jumlah_tagihan: {
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
    await queryInterface.dropTable('PeriodeSPPs');
  }
};