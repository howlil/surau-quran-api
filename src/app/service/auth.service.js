const { prisma } = require('../../lib/config/prisma.config');
const { UnauthorizedError, ConflictError, NotFoundError, ForbiddenError, BadRequestError, handlePrismaError } = require('../../lib/http/error.handler.http');
const { logger } = require('../../lib/config/logger.config');
const TokenUtils = require('../../lib/utils/token.utils');
const PasswordUtils = require('../../lib/utils/password.utils');
const EmailUtils = require('../../lib/utils/email.utils');
const crypto = require('crypto');

class AuthService {
    async #generateResetToken(userId) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        try {
            await prisma.$transaction([
                prisma.passwordResetToken.deleteMany({
                    where: { userId }
                }),
                prisma.passwordResetToken.create({
                    data: {
                        userId,
                        token,
                        expiresAt
                    }
                })
            ]);

            return token;
        } catch (error) {
            logger.error('Error generating reset token:', error);
            throw handlePrismaError(error);
        }
    }

    async #sendPasswordResetEmail(email, token) {
        try {
            const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
            await EmailUtils.sendPasswordResetEmail({ email, resetLink });
        } catch (error) {
            logger.error('Error sending reset email:', error);
            throw new Error('Gagal mengirim email reset password');
        }
    }

    async requestPasswordReset(email) {
        try {
            logger.info(`Starting password reset request for email: ${email}`);

            const user = await prisma.user.findUnique({
                where: { email }
            });

            if (!user) {
                logger.warn(`Password reset requested for non-existent email: ${email}`);
                throw new NotFoundError('User not found');
            }

            logger.info(`Found user with ID: ${user.id} for password reset request`);

            const resetToken = await this.#generateResetToken(user.id);
            const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            logger.info(`Generated reset token for user ID: ${user.id}, token expires at: ${resetTokenExpiry}`);

            const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
            logger.info(`Generated reset link for user ID: ${user.id}`);

            let emailSent = true;
            try {
                await EmailUtils.sendPasswordResetEmail({
                    email: user.email,
                    resetLink
                });
                logger.info(`Successfully sent password reset email to: ${user.email}`);
            } catch (emailError) {
                emailSent = false;
                logger.error('Failed to send password reset email:', {
                    error: emailError.message,
                    stack: emailError.stack,
                    userId: user.id,
                    email: user.email
                });
            }

            return {
                message: emailSent
                    ? 'Password reset email sent successfully'
                    : 'Password reset token generated but email could not be sent',
                token: !emailSent ? resetToken : undefined
            };
        } catch (error) {
            logger.error('Error in requestPasswordReset:', {
                error: error.message,
                stack: error.stack,
                email
            });
            throw error;
        }
    }

    async resetPassword(token, newPassword) {
        try {
            logger.info(`Starting password reset process for token: ${token}`);

            const resetToken = await prisma.passwordResetToken.findFirst({
                where: {
                    token,
                    expiresAt: {
                        gt: new Date()
                    }
                },
                include: {
                    user: true
                }
            });

            if (!resetToken) {
                logger.warn(`Invalid or expired reset token used: ${token}`);
                throw new NotFoundError('Invalid or expired reset token');
            }

            const user = resetToken.user;
            logger.info(`Found valid reset token for user ID: ${user.id}`);

            const hashedPassword = await PasswordUtils.hash(newPassword);
            logger.info(`Generated hashed password for user ID: ${user.id}`);

            await prisma.$transaction([
                prisma.user.update({
                    where: { id: user.id },
                    data: {
                        password: hashedPassword
                    }
                }),
                prisma.passwordResetToken.delete({
                    where: { id: resetToken.id }
                })
            ]);

            logger.info(`Successfully updated password for user ID: ${user.id}`);

            try {
                await EmailUtils.sendPasswordChangedEmail({
                    email: user.email
                });
                logger.info(`Successfully sent password changed notification to: ${user.email}`);
            } catch (emailError) {
                logger.warn('Failed to send password changed notification:', {
                    error: emailError.message,
                    userId: user.id,
                    email: user.email
                });
                // Don't throw error here as password was already changed
            }

            return { message: 'Password reset successfully' };
        } catch (error) {
            logger.error('Error in resetPassword:', {
                error: error.message,
                stack: error.stack,
                token
            });
            throw error;
        }
    }

    async login(email, password) {
        if (!email || !password) {
            throw new BadRequestError('Email dan password harus diisi');
        }

        try {
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase().trim() }
            });

            if (!user) {
                throw new UnauthorizedError('Email atau password salah');
            }

            const isValidPassword = await PasswordUtils.verify(password, user.password);

            if (!isValidPassword) {
                throw new UnauthorizedError('Email atau password salah');
            }

            const token = await TokenUtils.generateToken(user.id);

            return {
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                }
            };
        } catch (error) {
            throw handlePrismaError(error);
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
            throw handlePrismaError(error);
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
            throw handlePrismaError(error);
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
            throw handlePrismaError(error);
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
            throw handlePrismaError(error);
        }
    }
}

module.exports = new AuthService();