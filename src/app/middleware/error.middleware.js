const multer = require('multer');
const Http = require('../../lib/http');
const { BadRequestError } = require('../../lib/http/errors.http');

class ErrorMiddleware {
    static handleMulterError(err, req, res, next) {
        if (err instanceof multer.MulterError) {
            switch (err.code) {
                case 'LIMIT_FILE_SIZE':
                    return Http.Response.badRequest(res, 'File terlalu besar', {
                        [err.field]: 'Ukuran file melebihi batas maksimum'
                    });
                case 'LIMIT_UNEXPECTED_FILE':
                    return Http.Response.badRequest(res, 'File tidak sesuai', {
                        [err.field]: 'Field ini bukan field upload file'
                    });
                default:
                    return Http.Response.badRequest(res, 'Error saat upload file', {
                        [err.field || 'file']: err.message
                    });
            }
        } else if (err instanceof BadRequestError) {
            return Http.Response.badRequest(res, err.message, {
                file: err.message
            });
        }
        next(err);
    }
}

module.exports = ErrorMiddleware; 