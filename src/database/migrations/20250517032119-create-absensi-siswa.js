'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AbsensiSiswas', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id: {
        type: Sequelize.UUID
      },
      jadwal_siswa_id: {
        type: Sequelize.UUID
      },
      tanggal: {
        type: Sequelize.DATE
      },
      jam_masuk: {
        type: Sequelize.TIME
      },
      status_kehadiran: {
        type: Sequelize.ENUM('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT')
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
    await queryInterface.dropTable('AbsensiSiswas');
  }
};