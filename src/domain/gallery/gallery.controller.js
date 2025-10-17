const BaseController = require("../../shared/base/base.controller")

class GalleryController extends BaseController {
    constructor(galleryService, logger) {
        super(galleryService, logger)
        this.galleryService = galleryService
        this.logger = logger
    }
}

module.exports = GalleryController