const BaseRepository = require("../../shared/base/base.repository")

class GalleryRepository extends BaseRepository {
    constructor(prisma, logger) {
        super(prisma.gallery, logger)
    }
}

module.exports = GalleryRepository