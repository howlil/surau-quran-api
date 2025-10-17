const { prisma } = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const PasswordUtils = require('../../lib/utils/password.utils');
const PrismaUtils = require('../../lib/utils/prisma.utils');

class AdminService {
    async createAdmin(userData, requestUserId) {
        try {
            const requestUser = await prisma.user.findUnique({
                where: { id: requestUserId },
                include: { admin: true }
            });

            if (!requestUser || (requestUser.role !== 'SUPER_ADMIN' && requestUser.role !== 'ADMIN_SURAU')) {
                throw ErrorFactory.forbidden('Hanya admin yang dapat membuat akun admin');
            }
            const existingUser = await prisma.user.findUnique({
                where: { email: userData.email }
            });

            if (existingUser) {
                throw ErrorFactory.badRequest('Email sudah terdaftar');
            }

            const hashedPassword = await PasswordUtils.hash(userData.password);

            const role = 'ADMIN';

            const result = await prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        email: userData.email,
                        password: hashedPassword,
                        role: role,
                    }
                });

                const admin = await tx.admin.create({
                    data: {
                        userId: user.id,
                        nama: userData.nama,
                    }
                });

                return { user, admin };
            });

            return {
                id: result.admin.id,
                email: result.user.email,
                nama: result.admin.nama,
                role: result.user.role
            };
        } catch (error) {
            throw error;
        }
    }

    async getAllAdmins(requestUserId, filters = {}) {
        try {
            const { page = 1, limit = 10, nama } = filters;

            const requestUser = await prisma.user.findUnique({
                where: { id: requestUserId },
                include: { admin: true }
            });

            if (!requestUser || (requestUser.role !== 'SUPER_ADMIN' && requestUser.role !== 'ADMIN_SURAU')) {
                throw ErrorFactory.forbidden('Hanya admin yang dapat melihat daftar admin');
            }

            const where = {};

            if (nama) {
                where.nama = {
                    contains: nama
                };
            }

            const result = await PrismaUtils.paginate(prisma.admin, {
                page,
                limit,
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            role: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            const transformedData = {
                ...result,
                data: result.data
                    .filter(admin => admin.user.role === 'ADMIN')
                    .map(admin => ({
                        id: admin.id,
                        nama: admin.nama,
                        email: admin.user.email,
                    }))
            };

            return transformedData;
        } catch (error) {
            throw error;
        }
    }

    async updateAdmin(adminId, updateData, requestUserId) {
        try {
            const requestUser = await prisma.user.findUnique({
                where: { id: requestUserId },
                include: { admin: true }
            });

            if (!requestUser || (requestUser.role !== 'SUPER_ADMIN' && requestUser.role !== 'ADMIN_SURAU')) {
                throw ErrorFactory.forbidden('Hanya admin yang dapat mengubah data admin');
            }

            const admin = await prisma.admin.findUnique({
                where: { id: adminId },
                include: { user: true }
            });

            if (!admin) {
                throw ErrorFactory.notFound('Admin tidak ditemukan');
            }

            const updateUserData = {};
            const updateAdminData = {};

            if (updateData.email) {
                if (updateData.email !== admin.user.email) {
                    const existingUserWithEmail = await prisma.user.findUnique({
                        where: { email: updateData.email }
                    });

                    if (existingUserWithEmail) {
                        throw ErrorFactory.badRequest('Email sudah terdaftar');
                    }

                    updateUserData.email = updateData.email;
                }
            }

            if (updateData.password) {
                updateUserData.password = await PasswordUtils.hash(updateData.password);
            }

            if (updateData.nama) {
                updateAdminData.nama = updateData.nama;
            }

            const result = await prisma.$transaction(async (tx) => {
                let updatedUser = admin.user;
                if (Object.keys(updateUserData).length > 0) {
                    updatedUser = await tx.user.update({
                        where: { id: admin.userId },
                        data: updateUserData
                    });
                }

                let updatedAdmin = admin;
                if (Object.keys(updateAdminData).length > 0) {
                    updatedAdmin = await tx.admin.update({
                        where: { id: adminId },
                        data: updateAdminData
                    });
                }

                return { user: updatedUser, admin: updatedAdmin };
            });

            return {
                id: result.admin.id,
                userId: result.user.id,
                nama: result.admin.nama,
                email: result.user.email,
                updatedAt: result.admin.updatedAt
            };
        } catch (error) {
            throw error;
        }
    }

    async deleteAdmin(adminId, requestUserId) {
        try {
            const requestUser = await prisma.user.findUnique({
                where: { id: requestUserId },
                include: { admin: true }
            });

            if (!requestUser || (requestUser.role !== 'SUPER_ADMIN' && requestUser.role !== 'ADMIN_SURAU')) {
                throw ErrorFactory.forbidden('Hanya admin yang dapat menghapus akun admin');
            }

            const admin = await prisma.admin.findUnique({
                where: { id: adminId },
                include: { user: true }
            });

            if (!admin) {
                throw ErrorFactory.notFound('Admin tidak ditemukan');
            }

            if (admin.userId === requestUserId) {
                throw ErrorFactory.forbidden('Tidak dapat menghapus akun admin sendiri');
            }

            await prisma.$transaction(async (tx) => {
                await tx.admin.delete({ where: { id: adminId } });
                await tx.user.delete({ where: { id: admin.userId } });
            });

            return true;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new AdminService();
