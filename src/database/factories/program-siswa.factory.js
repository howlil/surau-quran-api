class ProgramSiswaFactory {
    static create(siswaId, programId, kelasProgramId) {
        const statuses = ['AKTIF', 'TIDAK_AKTIF', 'CUTI'];
        const status = Math.random() > 0.7 ? statuses[Math.floor(Math.random() * 2) + 1] : 'AKTIF'; // 70% chance to be 'AKTIF'

        return {
            siswaId,
            programId,
            kelasProgramId,
            status
        };
    }
}

module.exports = ProgramSiswaFactory; 