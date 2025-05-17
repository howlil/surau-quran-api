'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Pembayarans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id: {
        type: Sequelize.UUID
      },
      tipe_pembayaran: {
        type: Sequelize.ENUM('PENDAFTARAN', 'SPP')
      },
      referensi_id: {
        type: Sequelize.STRING
      },
      metode_pembayaran: {
        type: Sequelize.ENUM('TUNAI', 'VIRTUAL_ACCOUNT', 'EWALLET', 'RETAIL_OUTLET', 'CREDIT_CARD', 'QRIS')
      },
      jumlah: {
        type: Sequelize.DECIMAL
      },
      status_pembayaran: {
        type: Sequelize.ENUM('PENDING', 'MENUNGGU_PEMBAYARAN', 'LUNAS', 'BELUM_BAYAR', 'KADALUARSA', 'DIBATALKAN')
      },
      tanggal_pembayaran: {
        type: Sequelize.DATE
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
    await queryInterface.dropTable('Pembayarans');
  }
};