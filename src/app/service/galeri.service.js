const prisma  = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const FileUtils = require('../../lib/utils/file.utils');
const logger = require('../../lib/config/logger.config');

class GaleriService {
    async create(options) {
        try {
            const { data } = options;
            
            const galeri = await prisma.galeri.create({
                data: {
                    judulFoto: data.judulFoto,
                    coverGaleri: data.coverGaleri
                }
            });

            const transformedResult = FileUtils.transformGaleriFiles(galeri);

            return {
                galeriId: transformedResult.id,
                judulFoto: transformedResult.judulFoto,
                coverGaleri: transformedResult.coverGaleri
            };
        } catch (error) {
            throw error
        }
    }

    async getAll(options = {}) {
        try {
            const { filters = {} } = options;
            const { page = 1, limit = 10, judul } = filters;

            const where = {};
            
            if (judul) {
                where.judulFoto = {
                    contains: judul
                };
            }

            const result = await PrismaUtils.paginate(prisma.galeri, {
                page,
                limit,
                where,
                orderBy: { createdAt: 'desc' }
            });

            const transformedData = {
                ...result,
                data: result.data.map(galeri => ({
                    galeriId: galeri.id,
                    judulFoto: galeri.judulFoto,
                    coverGaleri: FileUtils.getImageUrl(galeri.coverGaleri)
                }))
            };

            return transformedData;
        } catch (error) {
            throw error
        }
    }



    async update(options) {
        try {
            const { data, where } = options;
            const { id } = where;
            
            // Check if galeri exists
            const galeri = await prisma.galeri.findUnique({
                where: { id }
            });

            if (!galeri) {
                throw ErrorFactory.notFound(`Galeri dengan ID ${id} tidak ditemukan`);
            }

            const updated = await prisma.galeri.update({
                where: { id },
                data
            });

            const transformedResult = FileUtils.transformGaleriFiles(updated);

            return {
                galeriId: transformedResult.id,
                judulFoto: transformedResult.judulFoto,
                coverGaleri: transformedResult.coverGaleri
            };
        } catch (error) {
            if (error.statusCode) throw error;
            throw error
        }
    }

    async delete(options) {
        try {
            const { where } = options;
            const { id } = where;
            
            // Check if galeri exists
            const galeri = await prisma.galeri.findUnique({
                where: { id }
            });

            if (!galeri) {
                throw ErrorFactory.notFound(`Galeri dengan ID ${id} tidak ditemukan`);
            }

            await prisma.galeri.delete({
                where: { id }
            });

            return { id };
        } catch (error) {
            if (error.statusCode) throw error;
            throw error
        }
    }
}

module.exports = new GaleriService(); 