const { prisma } = require('../../lib/config/prisma.config');
const { UnauthorizedError, ConflictError, NotFoundError, ForbiddenError } = require('../../lib/http/errors.http');
const { logger } = require('../../lib/config/logger.config');
const TokenUtils = require('../../lib/utils/token.utils');
const PasswordUtils = require('../../lib/utils/password.utils');

class AuthService {
    async login(email, password) {
        try {
            const user = await prisma.user.findUnique({
                where: { email }
            });

            if (!user) {
                throw new UnauthorizedError('Email atau password salah');
            }

            const isValidPassword = await PasswordUtils.verify(password, user.password);

            if (!isValidPassword) {
                throw new UnauthorizedError('Email atau password salah');
            }

            const token = await TokenUtils.generateToken(user.id);

            return { token, user: { id: user.id, email: user.email, role: user.role } };
        } catch (error) {
            logger.error('Login error:', error);
            throw error;
        }
    }

    async logout(token) {
        try {
            return await TokenUtils.revokeToken(token);
        } catch (error) {
            logger.error('Logout error:', error);
            throw error;
        }
    }

    async createAdmin(userData, requestUserId) {
        try {
            const requestUser = await prisma.user.findUnique({
                where: { id: requestUserId },
                include: { admin: true }
            });

            if (!requestUser || requestUser.role !== 'ADMIN') {
                throw new ForbiddenError('Hanya admin yang dapat membuat akun admin');
            }

            const existingUser = await prisma.user.findUnique({
                where: { email: userData.email }
            });

            if (existingUser) {
                throw new ConflictError('Email sudah terdaftar');
            }

            const hashedPassword = await PasswordUtils.hash(userData.password);

            const result = await prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        email: userData.email,
                        password: hashedPassword,
                        role: 'ADMIN',
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
            };
        } catch (error) {
            logger.error('Create admin error:', error);
            throw error;
        }
    }

    async getAllAdmins(requestUserId) {
        try {
            const requestUser = await prisma.user.findUnique({
                where: { id: requestUserId },
                include: { admin: true }
            });

            if (!requestUser || requestUser.role !== 'ADMIN') {
                throw new ForbiddenError('Hanya admin yang dapat melihat daftar admin');
            }

            const admins = await prisma.admin.findMany({
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                        }
                    }
                }
            });

            return admins.map(admin => ({
                id: admin.id,
                nama: admin.nama,
                email: admin.user.email,

            }));
        } catch (error) {
            logger.error('Get admins error:', error);
            throw error;
        }
    }

 

    async updateAdmin(adminId, updateData, requestUserId) {
        try {
            const requestUser = await prisma.user.findUnique({
                where: { id: requestUserId },
                include: { admin: true }
            });

            if (!requestUser || requestUser.role !== 'ADMIN') {
                throw new ForbiddenError('Hanya admin yang dapat mengubah data admin');
            }

            const admin = await prisma.admin.findUnique({
                where: { id: adminId },
                include: { user: true }
            });

            if (!admin) {
                throw new NotFoundError('Admin tidak ditemukan');
            }

            const updateUserData = {};
            const updateAdminData = {};

            if (updateData.email) {
                if (updateData.email !== admin.user.email) {
                    const existingUserWithEmail = await prisma.user.findUnique({
                        where: { email: updateData.email }
                    });

                    if (existingUserWithEmail) {
                        throw new ConflictError('Email sudah terdaftar');
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
            logger.error('Update admin error:', error);
            throw error;
        }
    }

    async deleteAdmin(adminId, requestUserId) {
        try {
            const requestUser = await prisma.user.findUnique({
                where: { id: requestUserId },
                include: { admin: true }
            });

            if (!requestUser || requestUser.role !== 'ADMIN') {
                throw new ForbiddenError('Hanya admin yang dapat menghapus akun admin');
            }

            const admin = await prisma.admin.findUnique({
                where: { id: adminId },
                include: { user: true }
            });

            if (!admin) {
                throw new NotFoundError('Admin tidak ditemukan');
            }

            // Prevent self-deletion
            if (admin.userId === requestUserId) {
                throw new ForbiddenError('Tidak dapat menghapus akun admin sendiri');
            }

            await prisma.$transaction(async (tx) => {
                await tx.admin.delete({ where: { id: adminId } });
                await tx.token.deleteMany({ where: { userId: admin.userId } });
                await tx.user.delete({ where: { id: admin.userId } });
            });

            return true;
        } catch (error) {
            logger.error('Delete admin error:', error);
            throw error;
        }
    }

    // TODO : lupa password send ke email link passwordnya nanti redirect ke frontend
}

module.exports = new AuthService();