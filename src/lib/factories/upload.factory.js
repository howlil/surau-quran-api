const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ErrorFactory = require('./error.factory');
const { UPLOAD_DIRS, FILE_LIMITS, ALLOWED_TYPES, FIELD_PATHS, ERROR_MESSAGES } = require('../constants/upload.constants');

class UploadFactory {
    constructor() {
        this.initializeDirectories();
    }

    // ========================================
    // INITIALIZATION
    // ========================================
    initializeDirectories() {
        UPLOAD_DIRS.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    // ========================================
    // FILE FILTERS
    // ========================================
    createFileFilter(allowedTypes, errorMessage) {
        return (req, file, cb) => {
            const isValidMime = allowedTypes.mimes.includes(file.mimetype);
            const isValidExt = allowedTypes.exts.includes(path.extname(file.originalname).toLowerCase());
            
            if (isValidMime && isValidExt) {
                return cb(null, true);
            }
            cb(ErrorFactory.badRequest(errorMessage), false);
        };
    }

    getImageFileFilter() {
        return this.createFileFilter(ALLOWED_TYPES.IMAGE, ERROR_MESSAGES.INVALID_FILE_TYPE.IMAGE);
    }

    getDocumentFileFilter() {
        return this.createFileFilter(ALLOWED_TYPES.DOCUMENT, ERROR_MESSAGES.INVALID_FILE_TYPE.DOCUMENT);
    }

    getPdfFileFilter() {
        return this.createFileFilter(ALLOWED_TYPES.PDF, ERROR_MESSAGES.INVALID_FILE_TYPE.PDF);
    }

    getImageOrPdfFileFilter() {
        return this.createFileFilter(ALLOWED_TYPES.IMAGE_OR_PDF, ERROR_MESSAGES.INVALID_FILE_TYPE.IMAGE_OR_PDF);
    }

    // ========================================
    // STORAGE CONFIGURATION
    // ========================================
    createStorage() {
        return multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadPath = FIELD_PATHS[file.fieldname];
                if (!uploadPath) {
                    return cb(ErrorFactory.badRequest(ERROR_MESSAGES.INVALID_FIELD_NAME));
                }
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const ext = path.extname(file.originalname).toLowerCase();
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
            }
        });
    }

    // ========================================
    // MULTER INSTANCES
    // ========================================
    createMulterInstance(fileFilter, fileSizeLimit, fieldType = 'single', fieldName = 'file') {
        const multerInstance = multer({ 
            storage: this.createStorage(), 
            fileFilter, 
            limits: { fileSize: fileSizeLimit } 
        });

        if (fieldType === 'single') {
            return multerInstance.single(fieldName);
        } else if (fieldType === 'fields') {
            return multerInstance.fields(fieldName);
        }
        return multerInstance;
    }

    // ========================================
    // ERROR HANDLING
    // ========================================
    handleUploadError(err, next) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(ErrorFactory.badRequest(ERROR_MESSAGES.FILE_SIZE_TOO_LARGE));
            }
            return next(ErrorFactory.badRequest(err.message));
        }
        return next(err);
    }

    // ========================================
    // CUSTOM HANDLERS
    // ========================================
    handleSuratIzinUpload(req) {
        const statusKehadiran = req.body?.statusKehadiran;
        
        if ((statusKehadiran === 'IZIN' || statusKehadiran === 'SAKIT') && req.file) {
            req.body.suratIzin = req.file.filename;
        } else if (req.file && statusKehadiran && statusKehadiran !== 'IZIN' && statusKehadiran !== 'SAKIT') {
            try {
                fs.unlinkSync(req.file.path);
            } catch (error) {
                console.error('Error deleting file:', error);
            }
            delete req.body.suratIzin;
        } else if (req.file && !statusKehadiran) {
            req.body.suratIzin = req.file.filename;
        }
    }

    handleEvidencePendaftaranUpload(req) {
        if (req.file && req.file.fieldname === 'evidence') {
            req.body.evidence = req.file.filename;
        } else if (req.files) {
            if (Array.isArray(req.files)) {
                const evidenceFile = req.files.find(file => file.fieldname === 'evidence');
                if (evidenceFile) {
                    req.body.evidence = evidenceFile.filename;
                }
            } else if (req.files.evidence) {
                req.body.evidence = req.files.evidence.filename;
            }
        }

        // Transform form-data untuk memproses array chanel
        if (req.body) {
            const transformedBody = {};
            const chanelArray = [];
            
            // Preserve evidence first
            if (req.body.evidence) {
                transformedBody.evidence = req.body.evidence;
            }
            
            Object.keys(req.body).forEach(key => {
                if (key.startsWith('chanel[')) {
                    const match = key.match(/chanel\[(\d+)\]\.(.+)/);
                    if (match) {
                        const index = parseInt(match[1]);
                        const property = match[2];
                        
                        if (!chanelArray[index]) {
                            chanelArray[index] = {};
                        }
                        chanelArray[index][property] = req.body[key];
                    }
                } else if (key !== 'evidence') {
                    // Handle special data types
                    if (['jumlahPembayaran', 'biayaPendaftaran', 'totalBiaya'].includes(key)) {
                        transformedBody[key] = parseFloat(req.body[key]);
                    } else if (key === 'isOther') {
                        transformedBody[key] = req.body[key] === 'true';
                    } else {
                        transformedBody[key] = req.body[key];
                    }
                }
            });
            
            if (chanelArray.length > 0) {
                transformedBody.chanel = chanelArray.filter(item => item && Object.keys(item).length > 0);
            }
            
            req.body = transformedBody;
        }
    }

    handleEvidencePaymentUpload(req) {
        // Parse JSON string
        if (req.body?.periodeSppIds && typeof req.body.periodeSppIds === 'string') {
            try {
                req.body.periodeSppIds = JSON.parse(req.body.periodeSppIds);
            } catch (error) {
                throw ErrorFactory.badRequest(ERROR_MESSAGES.INVALID_JSON_FORMAT);
            }
        }

        // Handle uploaded files
        if (req.files?.evidence?.[0]) {
            req.body.evidence = req.files.evidence[0].filename;
            req.file = req.files.evidence[0];
        }
    }

    handleKartuKeluargaUpload(req) {
        // Handle uploaded files
        if (req.files) {
            if (req.files.kartuKeluarga?.[0]) {
                req.file = req.files.kartuKeluarga[0];
                req.body.kartuKeluarga = req.files.kartuKeluarga[0].filename;
            } else if (req.files.evidence?.[0]) {
                req.file = req.files.evidence[0];
            }
            
            if (req.files.evidence?.[0]) {
                req.body.evidence = req.files.evidence[0].filename;
            }
        }

        // Transform form-data
        if (req.body) {
            const transformedBody = {};
            const siswaArray = [];
            const chanelArray = [];
            
            // Preserve kartuKeluarga and evidence first
            if (req.body.kartuKeluarga) {
                transformedBody.kartuKeluarga = req.body.kartuKeluarga;
            }
            if (req.body.evidence) {
                transformedBody.evidence = req.body.evidence;
            }
            
            Object.keys(req.body).forEach(key => {
                if (key.startsWith('siswa[')) {
                    const match = key.match(/siswa\[(\d+)\]\.(.+)/);
                    if (match) {
                        const index = parseInt(match[1]);
                        const property = match[2];
                        
                        if (!siswaArray[index]) {
                            siswaArray[index] = {};
                        }
                        siswaArray[index][property] = req.body[key];
                    }
                } else if (key.startsWith('chanel[')) {
                    const match = key.match(/chanel\[(\d+)\]\.(.+)/);
                    if (match) {
                        const index = parseInt(match[1]);
                        const property = match[2];
                        
                        if (!chanelArray[index]) {
                            chanelArray[index] = {};
                        }
                        chanelArray[index][property] = req.body[key];
                    }
                } else if (!['kartuKeluarga', 'evidence'].includes(key)) {
                    // Handle special data types
                    if (['biayaPendaftaran', 'totalBiaya', 'jumlahPembayaran'].includes(key)) {
                        transformedBody[key] = parseFloat(req.body[key]);
                    } else if (key === 'isFamily' || key === 'isOther') {
                        transformedBody[key] = req.body[key] === 'true';
                    } else {
                        transformedBody[key] = req.body[key];
                    }
                }
            });
            
            if (siswaArray.length > 0) {
                transformedBody.siswa = siswaArray.filter(item => item && Object.keys(item).length > 0);
            }
            
            if (chanelArray.length > 0) {
                transformedBody.chanel = chanelArray.filter(item => item && Object.keys(item).length > 0);
            }
            
            req.body = transformedBody;
        }
    }

    // ========================================
    // MIDDLEWARE CREATION
    // ========================================
    createUploadMiddleware(multerUpload, customHandler = null) {
        return (req, res, next) => {
            multerUpload(req, res, (err) => {
                if (err) return this.handleUploadError(err, next);
                
                if (customHandler) {
                    try {
                        customHandler(req);
                    } catch (error) {
                        return next(error);
                    }
                }
                
                next();
            });
        };
    }

    // ========================================
    // PREDEFINED MIDDLEWARE
    // ========================================
    getImageMiddleware() {
        const multerUpload = this.createMulterInstance(this.getImageFileFilter(), FILE_LIMITS.IMAGE, 'single', 'image');
        return this.createUploadMiddleware(multerUpload);
    }

    getSuratIzinMiddleware() {
        const multerUpload = this.createMulterInstance(this.getDocumentFileFilter(), FILE_LIMITS.DOCUMENT, 'single', 'suratIzin');
        return this.createUploadMiddleware(multerUpload, (req) => this.handleSuratIzinUpload(req));
    }

    getSuratKontrakMiddleware() {
        const multerUpload = this.createMulterInstance(this.getDocumentFileFilter(), FILE_LIMITS.DOCUMENT, 'single', 'suratKontrak');
        return this.createUploadMiddleware(multerUpload);
    }

    getCoverMiddleware() {
        const multerUpload = this.createMulterInstance(this.getImageFileFilter(), FILE_LIMITS.IMAGE, 'single', 'cover');
        return this.createUploadMiddleware(multerUpload);
    }

    getFotoUrlMiddleware() {
        const multerUpload = this.createMulterInstance(this.getImageFileFilter(), FILE_LIMITS.IMAGE, 'single', 'fotoUrl');
        return this.createUploadMiddleware(multerUpload);
    }

    getCoverGaleriMiddleware() {
        const multerUpload = this.createMulterInstance(this.getImageFileFilter(), FILE_LIMITS.IMAGE, 'single', 'coverGaleri');
        return this.createUploadMiddleware(multerUpload);
    }

    getEvidenceMiddleware() {
        const multerUpload = this.createMulterInstance(this.getPdfFileFilter(), FILE_LIMITS.PDF, 'single', 'evidence');
        return this.createUploadMiddleware(multerUpload);
    }

    getEvidencePendaftaranMiddleware() {
        const multerUpload = this.createMulterInstance(this.getImageOrPdfFileFilter(), FILE_LIMITS.DOCUMENT, 'single', 'evidence');
        return this.createUploadMiddleware(multerUpload, (req) => this.handleEvidencePendaftaranUpload(req));
    }

    getEvidencePaymentMiddleware() {
        const multerUpload = this.createMulterInstance(this.getImageFileFilter(), FILE_LIMITS.IMAGE, 'fields', [{ name: 'evidence', maxCount: 1 }]);
        return this.createUploadMiddleware(multerUpload, (req) => this.handleEvidencePaymentUpload(req));
    }

    getKartuKeluargaMiddleware() {
        const multerUpload = this.createMulterInstance(this.getImageOrPdfFileFilter(), FILE_LIMITS.IMAGE, 'fields', [{ name: 'kartuKeluarga', maxCount: 1 }, { name: 'evidence', maxCount: 1 }]);
        return this.createUploadMiddleware(multerUpload, (req) => this.handleKartuKeluargaUpload(req));
    }
}

module.exports = UploadFactory;
