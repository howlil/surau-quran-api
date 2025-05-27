const {prisma} = require('../../lib/config/prisma.config');

async function resetDatabase() {
    try {
        console.log('🗑️  Cleaning database...');

        
        const tables = [
            'xenditDisbursement',
            'payrollDisbursement',
            'xenditPayment',
            'pembayaran',
            'periodeSpp',
            'pendaftaran',
            'pendaftaranTemp',
            'absensiGuru',
            'absensiSiswa',
            'payroll',
            'riwayatStatusSiswa',
            'jadwalProgramSiswa',
            'programSiswa',
            'kelasProgram',
            'jamMengajar',
            'program',
            'kelas',
            'voucher',
            'token',
            'siswa',
            'guru',
            'admin',
            'user'
        ];

        for (const table of tables) {
            try {
                await prisma[table].deleteMany();
                console.log(`✅ Cleaned ${table} table`);
            } catch (error) {
                console.error(`❌ Error cleaning ${table} table:`, error.message);
                throw error;
            }
        }

        console.log('✅ Database cleaned successfully!');
    } catch (error) {
        console.error('❌ Error cleaning database:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

module.exports = resetDatabase; 