class FileUtils {
    static getImageUrl(baseUrl, filename) {
        if (!filename) return null;
        const actualFilename = filename.split('\\').pop();
        if (actualFilename.includes('uploads/images/')) {
            return `${baseUrl}/${actualFilename}`;
        }
        return `${baseUrl}/uploads/images/${actualFilename}`;
    }

    static getDocumentUrl(baseUrl, filename, type = 'surat_kontrak') {
        if (!filename) return null;
        const actualFilename = filename.split('\\').pop();
        if (actualFilename.includes(`uploads/documents/${type}/`)) {
            return `${baseUrl}/${actualFilename}`;
        }
        return `${baseUrl}/uploads/documents/${type}/${actualFilename}`;
    }

    static getSuratIzinUrl(baseUrl, filename) {
        return this.getDocumentUrl(baseUrl, filename, 'surat_izin');
    }

    static transformGuruFiles(guru, baseUrl) {
        if (!guru) return null;

        return {
            ...guru,
            fotoProfile: this.getImageUrl(baseUrl, guru.fotoProfile),
            suratKontrak: this.getDocumentUrl(baseUrl, guru.suratKontrak),
            user: guru.user
        };
    }

    static transformGuruListFiles(gurus, baseUrl) {
        if (!Array.isArray(gurus)) return [];

        return gurus.map(guru => this.transformGuruFiles(guru, baseUrl));
    }

    static transformAbsensiGuruFiles(absensi, baseUrl) {
        if (!absensi) return null;

        return {
            ...absensi,
            suratIzin: this.getSuratIzinUrl(baseUrl, absensi.suratIzin)
        };
    }

    static transformAbsensiGuruListFiles(absensiList, baseUrl) {
        if (!Array.isArray(absensiList)) return [];

        return absensiList.map(absensi => this.transformAbsensiGuruFiles(absensi, baseUrl));
    }

    static transformProgramFiles(program, baseUrl) {
        if (!program) return null;

        return {
            ...program,
            cover: this.getImageUrl(baseUrl, program.cover)
        };
    }

    static transformProgramListFiles(programs, baseUrl) {
        if (!Array.isArray(programs)) return [];

        return programs.map(program => this.transformProgramFiles(program, baseUrl));
    }

    static transformTestimoniFiles(testimoni, baseUrl) {
        if (!testimoni) return null;

        return {
            ...testimoni,
            fotoUrl: this.getImageUrl(baseUrl, testimoni.fotoUrl)
        };
    }

    static transformTestimoniListFiles(testimoniList, baseUrl) {
        if (!Array.isArray(testimoniList)) return [];

        return testimoniList.map(testimoni => this.transformTestimoniFiles(testimoni, baseUrl));
    }

    static transformGaleriFiles(galeri, baseUrl) {
        if (!galeri) return null;

        return {
            ...galeri,
            coverGaleri: this.getImageUrl(baseUrl, galeri.coverGaleri)
        };
    }

    static transformGaleriListFiles(galeriList, baseUrl) {
        if (!Array.isArray(galeriList)) return [];

        return galeriList.map(galeri => this.transformGaleriFiles(galeri, baseUrl));
    }

    static transformFinanceFiles(finance, baseUrl) {
        if (!finance) return null;

        return {
            ...finance,
            evidence: this.getDocumentUrl(baseUrl, finance.evidence, 'evidence')
        };
    }

    static transformFinanceListFiles(financeList, baseUrl) {
        if (!Array.isArray(financeList)) return [];

        return financeList.map(finance => this.transformFinanceFiles(finance, baseUrl));
    }

    static getKartuKeluargaUrl(baseUrl, filename) {
        return this.getDocumentUrl(baseUrl, filename, 'kartu_keluarga');
    }
}

module.exports = FileUtils; 