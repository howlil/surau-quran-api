const { prisma } = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const FileUtils = require('../../lib/utils/file.utils');

class TestimoniService {
    async create(options) {
        try {
            const { data } = options;

            const testimoni = await prisma.testimoni.create({
                data: {
                    nama: data.nama,
                    posisi: data.posisi,
                    isi: data.isi,
                    fotoUrl: data.fotoUrl
                }
            });

            const transformedResult = FileUtils.transformTestimoniFiles(testimoni);

            return {
                testimoniId: transformedResult.id,
                nama: transformedResult.nama,
                posisi: transformedResult.posisi,
                isi: transformedResult.isi,
                fotoUrl: transformedResult.fotoUrl
            };
        } catch (error) {
            throw error
        }
    }

    async getAll(options = {}) {
        try {
            const { data: filters = {}, where: additionalWhere = {} } = options;
            const { page = 1, limit = 10, nama } = filters;

            const where = { ...additionalWhere };

            if (nama) {
                where.OR = [
                    { nama: { contains: nama } },
                    { posisi: { contains: nama } }
                ];
            }

            const result = await PrismaUtils.paginate(prisma.testimoni, {
                page,
                limit,
                where,
                orderBy: { createdAt: 'desc' }
            });

            const transformedData = {
                ...result,
                data: result.data.map(testimoni => ({
                    testimoniId: testimoni.id,
                    nama: testimoni.nama,
                    posisi: testimoni.posisi,
                    isi: testimoni.isi,
                    fotoUrl: FileUtils.getImageUrl(testimoni.fotoUrl)
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

            const transformedResult = FileUtils.transformTestimoniFiles(updated);

            return {
                testimoniId: transformedResult.id,
                nama: transformedResult.nama,
                posisi: transformedResult.posisi,
                isi: transformedResult.isi,
                fotoUrl: transformedResult.fotoUrl
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