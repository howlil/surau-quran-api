const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Http = require('../../lib/http');
const { BadRequestError } = require('../../lib/http/errors.http');

// Ensure upload directories exist
const createUploadDirectories = () => {
    const directories = [
        'uploads/images',
        'uploads/documents/surat_kontrak',
        'uploads/documents/surat_izin',
        'uploads/documents/evidence'
    ];

    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

// Create directories on startup
createUploadDirectories();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = '';

        switch (file.fieldname) {
            case 'fotoProfile':
            case 'cover':
            case 'fotoUrl':
            case 'coverGaleri':
                uploadPath = 'uploads/images';
                break;
            case 'suratKontrak':
                uploadPath = 'uploads/documents/surat_kontrak';
                break;
            case 'suratIzin':
                uploadPath = 'uploads/documents/surat_izin';
                break;
            case 'evidence':
                uploadPath = 'uploads/documents/evidence';
                break;
            default:
                return cb(new BadRequestError('Invalid field name for file upload'));
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Get file extension
        const ext = path.extname(file.originalname).toLowerCase();
        // Create filename with timestamp and random number
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Combine parts
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const imageFileFilter = (req, file, cb) => {
    // Check mime type
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
            return cb(null, true);
        }
    }
    cb(new BadRequestError('File harus berupa gambar (JPG, JPEG, PNG, atau GIF)'), false);
};

const documentFileFilter = (req, file, cb) => {
    // Check mime type
    const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedMimes.includes(file.mimetype)) {
        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.pdf', '.doc', '.docx'].includes(ext)) {
            return cb(null, true);
        }
    }
    cb(new BadRequestError('File harus berupa dokumen (PDF, DOC, atau DOCX)'), false);
};

const pdfFileFilter = (req, file, cb) => {
    // Check mime type for PDF only
    if (file.mimetype === 'application/pdf') {
        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.pdf') {
            return cb(null, true);
        }
    }
    cb(new BadRequestError('File harus berupa PDF'), false);
};

// Configure multer for image uploads
const uploadImage = multer({
    storage: storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
}).single('image');

// Configure multer for surat_izin uploads
const uploadSuratIzin = multer({
    storage: storage,
    fileFilter: documentFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
}).single('suratIzin');

// Configure multer for surat_kontrak uploads
const uploadSuratKontrak = multer({
    storage: storage,
    fileFilter: documentFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
}).single('suratKontrak');

// Middleware wrapper for error handling
const uploadImageMiddleware = (req, res, next) => {
    uploadImage(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(new Http.Exception.BadRequest('File size too large. Maximum size is 5MB.'));
            }
            return next(new Http.Exception.BadRequest(err.message));
        } else if (err) {
            return next(err);
        }
        next();
    });
};

const uploadSuratIzinMiddleware = (req, res, next) => {
    uploadSuratIzin(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(new Http.Exception.BadRequest('File size too large. Maximum size is 10MB.'));
            }
            return next(new Http.Exception.BadRequest(err.message));
        } else if (err) {
            return next(err);
        }

        // After file is processed, check the status
        const statusKehadiran = req.body?.statusKehadiran;

        // If statusKehadiran is IZIN or SAKIT and file is uploaded, use it
        if ((statusKehadiran === 'IZIN' || statusKehadiran === 'SAKIT') && req.file) {
            req.body.suratIzin = req.file.filename;
        }
        // If file is uploaded but status is not IZIN/SAKIT, delete the file
        else if (req.file && statusKehadiran && statusKehadiran !== 'IZIN' && statusKehadiran !== 'SAKIT') {
            try {
                fs.unlinkSync(req.file.path);
            } catch (error) {
                console.error('Error deleting file:', error);
            }
            delete req.body.suratIzin;
        }
        // If file is uploaded and no statusKehadiran (partial update), keep the file
        else if (req.file && !statusKehadiran) {
            req.body.suratIzin = req.file.filename;
        }

        next();
    });
};

const uploadSuratKontrakMiddleware = (req, res, next) => {
    uploadSuratKontrak(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(new Http.Exception.BadRequest('File size too large. Maximum size is 10MB.'));
            }
            return next(new Http.Exception.BadRequest(err.message));
        } else if (err) {
            return next(err);
        }
        next();
    });
};

// Configure multer for cover uploads (Program)
const uploadCover = multer({
    storage: storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
}).single('cover');

// Configure multer for fotoUrl uploads (Testimoni)
const uploadFotoUrl = multer({
    storage: storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
}).single('fotoUrl');

// Middleware wrapper for cover upload
const uploadCoverMiddleware = (req, res, next) => {
    uploadCover(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(new Http.Exception.BadRequest('File size too large. Maximum size is 5MB.'));
            }
            return next(new Http.Exception.BadRequest(err.message));
        } else if (err) {
            return next(err);
        }
        next();
    });
};

// Middleware wrapper for fotoUrl upload
const uploadFotoUrlMiddleware = (req, res, next) => {
    uploadFotoUrl(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(new Http.Exception.BadRequest('File size too large. Maximum size is 5MB.'));
            }
            return next(new Http.Exception.BadRequest(err.message));
        } else if (err) {
            return next(err);
        }
        next();
    });
};

// Configure multer for coverGaleri uploads (Galeri)
const uploadCoverGaleri = multer({
    storage: storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
}).single('coverGaleri');

// Middleware wrapper for coverGaleri upload
const uploadCoverGaleriMiddleware = (req, res, next) => {
    uploadCoverGaleri(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(new Http.Exception.BadRequest('File size too large. Maximum size is 5MB.'));
            }
            return next(new Http.Exception.BadRequest(err.message));
        } else if (err) {
            return next(err);
        }
        next();
    });
};

// Configure multer for evidence uploads (Finance) - PDF Only
const uploadEvidence = multer({
    storage: storage,
    fileFilter: pdfFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for evidence
    }
}).single('evidence');

// Middleware wrapper for evidence upload
const uploadEvidenceMiddleware = (req, res, next) => {
    uploadEvidence(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(new Http.Exception.BadRequest('File size too large. Maximum size is 10MB.'));
            }
            return next(new Http.Exception.BadRequest(err.message));
        } else if (err) {
            return next(err);
        }
        next();
    });
};

// Export configurations and middleware
module.exports = {
    storage,
    imageFileFilter,
    documentFileFilter,
    pdfFileFilter,
    uploadImageMiddleware,
    uploadSuratIzinMiddleware,
    uploadSuratKontrakMiddleware,
    uploadCoverMiddleware,
    uploadFotoUrlMiddleware,
    uploadCoverGaleriMiddleware,
    uploadEvidenceMiddleware
}; 