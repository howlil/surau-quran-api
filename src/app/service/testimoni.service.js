const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, handlePrismaError } = require('../../lib/http/error.handler.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');

class TestimoniService {
    async create(data) {
        try {
            const testimoni = await prisma.testimoni.create({
                data: {
                    nama: data.nama,
                    posisi: data.posisi,
                    isi: data.isi,
                    fotoUrl: data.fotoUrl
                }
            });

            logger.info(`Created testimoni with ID: ${testimoni.id}`);
            return testimoni;
        } catch (error) {
            logger.error('Error creating testimoni:', error);
            throw handlePrismaError(error);
        }
    }

    async getAll(filters = {}) {
        try {
            const { page = 1, limit = 10, nama } = filters;

            const where = {};
            
            if (nama) {
                where.OR = [
                    { nama: { contains: nama } },
                    { posisi: { contains: nama } }
                ];
            }

            return await PrismaUtils.paginate(prisma.testimoni, {
                page,
                limit,
                where,
                orderBy: { createdAt: 'desc' }
            });
        } catch (error) {
            logger.error('Error getting all testimoni:', error);
            throw handlePrismaError(error);
        }
    }

 
    async update(id, data) {
        try {
            // Check if testimoni exists
            const testimoni = await prisma.testimoni.findUnique({
                where: { id }
            });

            if (!testimoni) {
                throw new NotFoundError(`Testimoni dengan ID ${id} tidak ditemukan`);
            }

            const updated = await prisma.testimoni.update({
                where: { id },
                data
            });

            logger.info(`Updated testimoni with ID: ${id}`);
            return updated;
        } catch (error) {
            logger.error(`Error updating testimoni with ID ${id}:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            // Check if testimoni exists
            const testimoni = await prisma.testimoni.findUnique({
                where: { id }
            });

            if (!testimoni) {
                throw new NotFoundError(`Testimoni dengan ID ${id} tidak ditemukan`);
            }

            await prisma.testimoni.delete({
                where: { id }
            });

            logger.info(`Deleted testimoni with ID: ${id}`);
            return { id };
        } catch (error) {
            logger.error(`Error deleting testimoni with ID ${id}:`, error);
            throw error;
        }
    }
}

module.exports = new TestimoniService(); 