const { prisma } = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
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

            return testimoni;
        } catch (error) {
            throw error
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
            throw error
        }
    }


    async update(id, data) {
        try {
            const testimoni = await prisma.testimoni.findUnique({
                where: { id }
            });

            if (!testimoni) {
                throw ErrorFactory.notFound(`Testimoni dengan ID ${id} tidak ditemukan`);
            }

            const updated = await prisma.testimoni.update({
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
            const testimoni = await prisma.testimoni.findUnique({
                where: { id }
            });

            if (!testimoni) {
                throw ErrorFactory.notFound(`Testimoni dengan ID ${id} tidak ditemukan`);
            }

            await prisma.testimoni.delete({
                where: { id }
            });

            return { id };
        } catch (error) {
            if (error.statusCode) throw error;
            throw error
        }
    }
}

module.exports = new TestimoniService(); 