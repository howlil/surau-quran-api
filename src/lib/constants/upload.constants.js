
const UPLOAD_DIRS = [
    'uploads/images',
    'uploads/documents/surat_kontrak',
    'uploads/documents/surat_izin',
    'uploads/documents/evidence',
    'uploads/documents/kartu_keluarga'
];

const FILE_LIMITS = {
    IMAGE: 5 * 1024 * 1024,      // 5MB
    DOCUMENT: 10 * 1024 * 1024,  // 10MB
    PDF: 10 * 1024 * 1024        // 10MB
};

const ALLOWED_TYPES = {
    IMAGE: {
        mimes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
        exts: ['.jpg', '.jpeg', '.png', '.gif']
    },
    DOCUMENT: {
        mimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        exts: ['.pdf', '.doc', '.docx']
    },
    PDF: {
        mimes: ['application/pdf'],
        exts: ['.pdf']
    },
    IMAGE_OR_PDF: {
        mimes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'],
        exts: ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
    }
};

const FIELD_PATHS = {
    'fotoProfile': 'uploads/images',
    'cover': 'uploads/images',
    'fotoUrl': 'uploads/images',
    'coverGaleri': 'uploads/images',
    'suratKontrak': 'uploads/documents/surat_kontrak',
    'suratIzin': 'uploads/documents/surat_izin',
    'evidence': 'uploads/documents/evidence',
    'kartuKeluarga': 'uploads/documents/kartu_keluarga'
};

const ERROR_MESSAGES = {
    INVALID_FILE_TYPE: {
        IMAGE: 'File harus berupa gambar (JPG, JPEG, PNG, atau GIF)',
        DOCUMENT: 'File harus berupa dokumen (PDF, DOC, atau DOCX)',
        PDF: 'File harus berupa PDF',
        IMAGE_OR_PDF: 'File harus berupa gambar (JPG, JPEG, PNG, GIF) atau PDF'
    },
    INVALID_FIELD_NAME: 'Invalid field name for file upload',
    FILE_SIZE_TOO_LARGE: 'File size too large. Maximum size exceeded.',
    INVALID_JSON_FORMAT: 'Format periodeSppIds tidak valid'
};

module.exports = {
    UPLOAD_DIRS,
    FILE_LIMITS,
    ALLOWED_TYPES,
    FIELD_PATHS,
    ERROR_MESSAGES
};
