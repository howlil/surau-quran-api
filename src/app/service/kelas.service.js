const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');

class KelasService {
    async create(data) {
        try {
            const existing = await prisma.kelas.findFirst({
                where: { namaKelas: data.namaKelas }
            });

            if (existing) {
                throw new ConflictError(`Kelas dengan nama ${data.namaKelas} sudah ada`);
            }

            const kelas = await prisma.kelas.create({
                data
            });

            logger.info(`Created kelas with ID: ${kelas.id}`);
            return kelas;
        } catch (error) {
            logger.error('Error creating kelas:', error);
            throw error;
        }
    }

    async update(id, data) {
        try {
            const kelas = await prisma.kelas.findUnique({
                where: { id }
            });

            if (!kelas) {
                throw new NotFoundError(`Kelas dengan ID ${id} tidak ditemukan`);
            }

            if (data.namaKelas && data.namaKelas !== kelas.namaKelas) {
                const existing = await prisma.kelas.findFirst({
                    where: {
                        namaKelas: data.namaKelas,
                        id: { not: id }
                    }
                });

                if (existing) {
                    throw new ConflictError(`Kelas dengan nama ${data.namaKelas} sudah ada`);
                }
            }

            const updated = await prisma.kelas.update({
                where: { id },
                data
            });

            logger.info(`Updated kelas with ID: ${id}`);
            return updated;
        } catch (error) {
            logger.error(`Error updating kelas with ID ${id}:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            // Check if kelas exists
            const kelas = await prisma.kelas.findUnique({
                where: { id }
            });

            if (!kelas) {
                throw new NotFoundError(`Kelas dengan ID ${id} tidak ditemukan`);
            }

            // Check if kelas is being used in KelasProgram
            const kelasProgram = await prisma.kelasProgram.findFirst({
                where: { kelasId: id }
            });

            if (kelasProgram) {
                throw new ConflictError('Kelas sedang digunakan dalam program kelas dan tidak dapat dihapus');
            }

            await prisma.kelas.delete({
                where: { id }
            });

            logger.info(`Deleted kelas with ID: ${id}`);
            return { id };
        } catch (error) {
            logger.error(`Error deleting kelas with ID ${id}:`, error);
            throw error;
        }
    }

    async getById(id) {
        try {
            const kelas = await prisma.kelas.findUnique({
                where: { id }
            });

            if (!kelas) {
                throw new NotFoundError(`Kelas dengan ID ${id} tidak ditemukan`);
            }

            return kelas;
        } catch (error) {
            logger.error(`Error getting kelas with ID ${id}:`, error);
            throw error;
        }
    }

    async getAll(filters = {}) {
        try {
            const { page = 1, limit = 10, namaKelas } = filters;

            const where = {};
            if (namaKelas) {
                where.namaKelas = { contains: namaKelas, mode: 'insensitive' };
            }

            return await PrismaUtils.paginate(prisma.kelas, {
                page,
                limit,
                where,
                orderBy: { namaKelas: 'asc' }
            });
        } catch (error) {
            logger.error('Error getting all kelas:', error);
            throw error;
        }
    }
}

module.exports = new KelasService();