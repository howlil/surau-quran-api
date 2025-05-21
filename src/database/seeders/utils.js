const { prisma } = require('../../lib/config/prisma.config');

// Define the dependency order for tables based on foreign key relationships
// This helps ensure we delete and seed in the correct order
const TABLE_ORDER = {
    delete: [
        // Child tables first
        'XenditDisbursement',
        'PayrollDisbursement',
        'XenditPayment',
        'AbsensiSiswa',
        'AbsensiGuru',
        'JadwalProgramSiswa',
        'RiwayatStatusSiswa',
        'PeriodeSpp',
        'Pendaftaran',
        'ProgramSiswa',
        'KelasProgram',
        'Token',
        // Then parent tables
        'Payroll',
        'Pembayaran',
        'Voucher',
        'JamMengajar',
        'Siswa',
        'Guru',
        'Admin',
        'Program',
        'Kelas',
        'User'
    ],
    seed: [
        // Parent tables first
        'User',
        'Kelas',
        'Program',
        'Admin',
        'Guru',
        'Siswa',
        'JamMengajar',
        'Voucher',
        'Pembayaran',
        'Payroll',
        // Then child tables
        'Token',
        'KelasProgram',
        'ProgramSiswa',
        'Pendaftaran',
        'PeriodeSpp',
        'RiwayatStatusSiswa',
        'JadwalProgramSiswa',
        'AbsensiGuru',
        'AbsensiSiswa',
        'XenditPayment',
        'PayrollDisbursement',
        'XenditDisbursement'
    ]
};

/**
 * Get all table names from the Prisma client
 * @returns {string[]} Array of table names
 */
function getAllTables() {
    return Object.keys(prisma)
        .filter(key => !key.startsWith('_') && key !== 'disconnect' && key !== 'connect');
}

/**
 * Get tables in the correct order for deletion or seeding
 * @param {string} operation 'delete' or 'seed'
 * @returns {string[]} Array of table names in the correct order
 */
function getTablesInOrder(operation) {
    const allTables = getAllTables();
    const orderedTables = TABLE_ORDER[operation] || [];

    // Make sure all tables are included by adding any missing tables at the end
    const missingTables = allTables.filter(table => !orderedTables.includes(table));
    return [...orderedTables, ...missingTables];
}

module.exports = {
    getAllTables,
    getTablesInOrder
}; 