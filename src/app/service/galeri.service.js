const { prisma } = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const PrismaUtils = require('../../lib/utils/prisma.utils');

class GaleriService {
    async create(data) {
        try {
            const galeri = await prisma.galeri.create({
                data: {
                    judulFoto: data.judulFoto,
                    coverGaleri: data.coverGaleri
                }
            });

            return galeri;
        } catch (error) {
            throw error
        }
    }

    async getAll(filters = {}) {
        try {
            const { page = 1, limit = 10, judul } = filters;

            const where = {};
            
            if (judul) {
                where.judulFoto = {
                    contains: judul
                };
            }

            return await PrismaUtils.paginate(prisma.galeri, {
                page,
                limit,
                where,
                orderBy: { createdAt: 'desc' }
            });
        } catch (error) {
            throw error
        }
    }



    async update(id, data) {
        try {
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

            return updated;
        } catch (error) {
            if (error.statusCode) throw error;
            throw error
        }
    }

    async delete(id) {
        try {
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