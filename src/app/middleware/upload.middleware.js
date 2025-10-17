const UploadFactory = require('../../lib/factories/upload.factory');

const uploadFactory = new UploadFactory();


module.exports = {
    imageFileFilter: uploadFactory.getImageFileFilter(),
    documentFileFilter: uploadFactory.getDocumentFileFilter(),
    pdfFileFilter: uploadFactory.getPdfFileFilter(),

    storage: uploadFactory.createStorage(),

    uploadImageMiddleware: uploadFactory.getImageMiddleware(),
    uploadSuratIzinMiddleware: uploadFactory.getSuratIzinMiddleware(),
    uploadSuratKontrakMiddleware: uploadFactory.getSuratKontrakMiddleware(),
    uploadCoverMiddleware: uploadFactory.getCoverMiddleware(),
    uploadFotoUrlMiddleware: uploadFactory.getFotoUrlMiddleware(),
    uploadCoverGaleriMiddleware: uploadFactory.getCoverGaleriMiddleware(),
    uploadEvidenceMiddleware: uploadFactory.getEvidenceMiddleware(),
    uploadEvidencePendaftaranMiddleware: uploadFactory.getEvidencePendaftaranMiddleware(),
    uploadEvidencePaymentMiddleware: uploadFactory.getEvidencePaymentMiddleware(),
    uploadKartuKeluargaMiddleware: uploadFactory.getKartuKeluargaMiddleware()
};