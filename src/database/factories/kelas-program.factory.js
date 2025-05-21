class KelasProgramFactory {
    static create(kelasId, programId, jamMengajarId, guruId, index) {
        const hari = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'][index % 6];
        const tipeKelas = ['REGULAR', 'INTENSIF', 'PRIVATE'][Math.floor(Math.random() * 3)];

        return {
            kelasId,
            programId,
            jamMengajarId,
            hari,
            guruId,
            tipeKelas
        };
    }
}

module.exports = KelasProgramFactory; 