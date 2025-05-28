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
        'uploads/documents/surat_izin'
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
                uploadPath = 'uploads/images';
                break;
            case 'suratKontrak':
                uploadPath = 'uploads/documents/surat_kontrak';
                break;
            case 'suratIzin':
                uploadPath = 'uploads/documents/surat_izin';
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

        if (statusKehadiran === 'IZIN' || statusKehadiran === 'SAKIT') {
            // File is required for IZIN or SAKIT
            if (!req.file) {
                return next(new BadRequestError('Surat izin wajib diupload untuk status IZIN atau SAKIT'));
            }
            // Set the filename in the request body
            req.body.suratIzin = req.file.filename;
        } else {
            // For other statuses, remove suratIzin if it exists
            if (req.file) {
                // If file was uploaded but status is not IZIN/SAKIT, delete the file
                try {
                    fs.unlinkSync(req.file.path);
                } catch (error) {
                    console.error('Error deleting file:', error);
                }
            }
            delete req.body.suratIzin;
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

// Export configurations and middleware
module.exports = {
    storage,
    imageFileFilter,
    documentFileFilter,
    uploadImageMiddleware,
    uploadSuratIzinMiddleware,
    uploadSuratKontrakMiddleware
}; 