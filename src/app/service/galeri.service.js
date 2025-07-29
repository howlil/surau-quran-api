const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, handlePrismaError } = require('../../lib/http/error.handler.http');
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

            logger.info(`Created galeri with ID: ${galeri.id}`);
            return galeri;
        } catch (error) {
            logger.error('Error creating galeri:', error);
            throw handlePrismaError(error);
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
            logger.error('Error getting all galeri:', error);
            throw handlePrismaError(error);
        }
    }



    async update(id, data) {
        try {
            // Check if galeri exists
            const galeri = await prisma.galeri.findUnique({
                where: { id }
            });

            if (!galeri) {
                throw new NotFoundError(`Galeri dengan ID ${id} tidak ditemukan`);
            }

            const updated = await prisma.galeri.update({
                where: { id },
                data
            });

            logger.info(`Updated galeri with ID: ${id}`);
            return updated;
        } catch (error) {
            logger.error(`Error updating galeri with ID ${id}:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            // Check if galeri exists
            const galeri = await prisma.galeri.findUnique({
                where: { id }
            });

            if (!galeri) {
                throw new NotFoundError(`Galeri dengan ID ${id} tidak ditemukan`);
            }

            await prisma.galeri.delete({
                where: { id }
            });

            logger.info(`Deleted galeri with ID: ${id}`);
            return { id };
        } catch (error) {
            logger.error(`Error deleting galeri with ID ${id}:`, error);
            throw error;
        }
    }
}

module.exports = new GaleriService(); 