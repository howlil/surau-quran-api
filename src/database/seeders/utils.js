const { prisma } = require('../../lib/config/prisma.config');


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


function getAllTables() {
    return Object.keys(prisma)
        .filter(key => !key.startsWith('_') && key !== 'disconnect' && key !== 'connect');
}


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