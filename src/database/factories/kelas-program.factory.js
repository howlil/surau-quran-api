class KelasProgramFactory {
    static create(kelasId, programId, jamMengajarId, guruId = null) {
        const hari = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'][Math.floor(Math.random() * 6)];

        // TipeKelas distribution based on typical class types
        const tipeKelasOptions = ['GROUP', 'PRIVATE', 'SUBSTITUTE', 'ONLINE'];
        const tipeKelasWeights = [0.7, 0.2, 0.05, 0.05]; // 70% group, 20% private, 5% substitute, 5% online

        let tipeKelasIndex = 0;
        const randomVal = Math.random();
        let cumulativeWeight = 0;

        for (let i = 0; i < tipeKelasWeights.length; i++) {
            cumulativeWeight += tipeKelasWeights[i];
            if (randomVal <= cumulativeWeight) {
                tipeKelasIndex = i;
                break;
            }
        }

        return {
            kelasId,
            programId,
            jamMengajarId,
            guruId,
            hari,
            tipeKelas: tipeKelasOptions[tipeKelasIndex]
        };
    }
}

module.exports = KelasProgramFactory; 