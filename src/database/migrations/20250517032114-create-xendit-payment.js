'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('XenditPayments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id: {
        type: Sequelize.UUID
      },
      pembayaran_id: {
        type: Sequelize.UUID
      },
      xendit_invoice_id: {
        type: Sequelize.STRING
      },
      xendit_external_id: {
        type: Sequelize.STRING
      },
      xendit_payment_url: {
        type: Sequelize.STRING
      },
      xendit_payment_method: {
        type: Sequelize.STRING
      },
      xendit_payment_channel: {
        type: Sequelize.STRING
      },
      xendit_expiry_date: {
        type: Sequelize.DATE
      },
      xendit_paid_at: {
        type: Sequelize.DATE
      },
      xendit_status: {
        type: Sequelize.ENUM('PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'FAILED')
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
    await queryInterface.dropTable('XenditPayments');
  }
};