class JadwalProgramSiswaFactory {
    static create(programSiswaId, jamMengajarId, index) {
        const hari = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'][index % 6];

        return {
            programSiswaId,
            jamMengajarId,
            hari
        };
    }
}

module.exports = JadwalProgramSiswaFactory; 