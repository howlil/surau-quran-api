'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AbsensiGurus', {
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
      kelas_program_id: {
        type: Sequelize.UUID
      },
      tanggal: {
        type: Sequelize.DATE
      },
      jam_masuk: {
        type: Sequelize.TIME
      },
      jam_keluar: {
        type: Sequelize.TIME
      },
      sks: {
        type: Sequelize.DECIMAL
      },
      status_kehadiran: {
        type: Sequelize.ENUM('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT')
      },
      surat_izin: {
        type: Sequelize.STRING
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
    await queryInterface.dropTable('AbsensiGurus');
  }
};