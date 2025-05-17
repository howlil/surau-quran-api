'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Payrolls', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id: {
        type: Sequelize.UUID
      },
      guru_id: {
        type: Sequelize.UUID
      },
      bulan: {
        type: Sequelize.INTEGER
      },
      tahun: {
        type: Sequelize.INTEGER
      },
      total_sks: {
        type: Sequelize.DECIMAL
      },
      gaji_pokok: {
        type: Sequelize.DECIMAL
      },
      insentif: {
        type: Sequelize.DECIMAL
      },
      izin: {
        type: Sequelize.DECIMAL
      },
      sakit: {
        type: Sequelize.DECIMAL
      },
      absen: {
        type: Sequelize.DECIMAL
      },
      total_gaji: {
        type: Sequelize.DECIMAL
      },
      tanggal_kalkulasi: {
        type: Sequelize.DATE
      },
      status_payroll: {
        type: Sequelize.ENUM('DRAFT', 'DIPROSES', 'SELESAI', 'GAGAL')
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
    await queryInterface.dropTable('Payrolls');
  }
};