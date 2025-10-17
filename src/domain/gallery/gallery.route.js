const BaseRoute = require("../../shared/base/base.route")
const galleryController = require("./gallery.controller")

class GalleryRoute extends BaseRoute {
    constructor() {
        super(galleryController)
    }

    static getInstance() {
        if (!GalleryRoute.instance) {
            GalleryRoute.instance = new GalleryRoute()
        }
        return GalleryRoute.instance
    }

    createRoute() {
        this.get("/v1/galleries", "findMany")
        this.post("/v1/gallery", "create")
        this.patch("/v1/gallery/:id", "update")
        this.delete("/v1/gallery/:id", "delete")
    }
}

module.exports = GalleryRoute.getInstance().getRouter()