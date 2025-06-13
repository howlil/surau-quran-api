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
}

module.exports = FileUtils; 