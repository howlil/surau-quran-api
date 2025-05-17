'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('KelasPrograms', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id: {
        type: Sequelize.UUID
      },
      kelas_id: {
        type: Sequelize.UUID
      },
      program_id: {
        type: Sequelize.UUID
      },
      hari: {
        type: Sequelize.ENUM('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU')
      },
      jam_id: {
        type: Sequelize.UUID
      },
      guru_id: {
        type: Sequelize.UUID
      },
      tipe_kelas: {
        type: Sequelize.ENUM('GROUP', 'PRIVATE')
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('KelasPrograms');
  }
};