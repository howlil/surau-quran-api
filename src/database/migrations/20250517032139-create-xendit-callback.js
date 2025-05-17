'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('XenditCallbacks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id: {
        type: Sequelize.UUID
      },
      callback_type: {
        type: Sequelize.ENUM('INVOICE', 'DISBURSEMENT', 'VIRTUAL_ACCOUNT')
      },
      reference_id: {
        type: Sequelize.STRING
      },
      reference_type: {
        type: Sequelize.ENUM('PEMBAYARAN', 'DISBURSEMENT')
      },
      event_type: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.STRING
      },
      amount: {
        type: Sequelize.DECIMAL
      },
      raw_response: {
        type: Sequelize.JSON
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
    await queryInterface.dropTable('XenditCallbacks');
  }
};