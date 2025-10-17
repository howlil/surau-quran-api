class FileUtils {
    static getBaseUrl() {
        return process.env.BACKEND_URL;
    }

    static getImageUrl(filename) {
        if (!filename) return null;
        const baseUrl = this.getBaseUrl();
        const actualFilename = filename.split('\\').pop();
        if (actualFilename.includes('uploads/images/')) {
            return `${baseUrl}/${actualFilename}`;
        }
        return `${baseUrl}/uploads/images/${actualFilename}`;
    }

    static getDocumentUrl(filename, type = 'surat_kontrak') {
        if (!filename) return null;
        const baseUrl = this.getBaseUrl();
        const actualFilename = filename.split('\\').pop();
        if (actualFilename.includes(`uploads/documents/${type}/`)) {
            return `${baseUrl}/${actualFilename}`;
        }
        return `${baseUrl}/uploads/documents/${type}/${actualFilename}`;
    }

    static getSuratIzinUrl(filename) {
        return this.getDocumentUrl(filename, 'surat_izin');
    }

    static getKartuKeluargaUrl(filename) {
        return this.getDocumentUrl(filename, 'kartu_keluarga');
    }

    static getEvidenceUrl(filename) {
        return this.getDocumentUrl(filename, 'evidence');
    }

    // Transform methods
    static transformGuruFiles(guru) {
        if (!guru) return null;
        return {
            ...guru,
            fotoProfile: this.getImageUrl(guru.fotoProfile),
            suratKontrak: this.getDocumentUrl(guru.suratKontrak),
            user: guru.user
        };
    }

    static transformGuruListFiles(gurus) {
        if (!Array.isArray(gurus)) return [];
        return gurus.map(guru => this.transformGuruFiles(guru));
    }

    static transformAbsensiGuruFiles(absensi) {
        if (!absensi) return null;
        return {
            ...absensi,
            suratIzin: this.getSuratIzinUrl(absensi.suratIzin)
        };
    }

    static transformAbsensiGuruListFiles(absensiList) {
        if (!Array.isArray(absensiList)) return [];
        return absensiList.map(absensi => this.transformAbsensiGuruFiles(absensi));
    }

    static transformProgramFiles(program) {
        if (!program) return null;
        return {
            ...program,
            cover: this.getImageUrl(program.cover)
        };
    }

    static transformProgramListFiles(programs) {
        if (!Array.isArray(programs)) return [];
        return programs.map(program => this.transformProgramFiles(program));
    }

    static transformTestimoniFiles(testimoni) {
        if (!testimoni) return null;
        return {
            ...testimoni,
            fotoUrl: this.getImageUrl(testimoni.fotoUrl)
        };
    }

    static transformTestimoniListFiles(testimoniList) {
        if (!Array.isArray(testimoniList)) return [];
        return testimoniList.map(testimoni => this.transformTestimoniFiles(testimoni));
    }

    static transformGaleriFiles(galeri) {
        if (!galeri) return null;
        return {
            ...galeri,
            coverGaleri: this.getImageUrl(galeri.coverGaleri)
        };
    }

    static transformGaleriListFiles(galeriList) {
        if (!Array.isArray(galeriList)) return [];
        return galeriList.map(galeri => this.transformGaleriFiles(galeri));
    }

    static transformFinanceFiles(finance) {
        if (!finance) return null;
        return {
            ...finance,
            evidence: this.getDocumentUrl(finance.evidence, 'evidence')
        };
    }

    static transformFinanceListFiles(financeList) {
        if (!Array.isArray(financeList)) return [];
        return financeList.map(finance => this.transformFinanceFiles(finance));
    }

    static transformPembayaranFiles(pembayaran) {
        if (!pembayaran) return null;
        return {
            ...pembayaran,
            evidence: this.getEvidenceUrl(pembayaran.evidence)
        };
    }

    static transformPembayaranListFiles(pembayaranList) {
        if (!Array.isArray(pembayaranList)) return [];
        return pembayaranList.map(pembayaran => this.transformPembayaranFiles(pembayaran));
    }
}

module.exports = FileUtils;