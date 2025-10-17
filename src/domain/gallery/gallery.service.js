const BaseService = require("../../shared/base/base.service")

class GalleryService extends BaseService {
    constructor(galleryRepository, logger) {
        super(galleryRepository, logger)
        this.galleryRepository = galleryRepository
    }
}

module.exports = GalleryService