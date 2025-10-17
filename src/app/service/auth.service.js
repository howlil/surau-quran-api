const { prisma } = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const TokenUtils = require('../../lib/utils/token.utils');
const PasswordUtils = require('../../lib/utils/password.utils');
const EmailUtils = require('../../lib/utils/email.utils');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const crypto = require('crypto');
const moment = require('moment');

class AuthService {
    async #generateResetToken(userId) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = moment().add(30, 'minutes').toDate(); // 30 minutes

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
            throw error;
        }
    }

    async requestPasswordReset(email) {
        try {

            const user = await prisma.user.findUnique({
                where: { email }
            });

            if (!user) {
                throw ErrorFactory.notFound('User not found');
            }


            const resetToken = await this.#generateResetToken(user.id);
            const resetTokenExpiry = moment().add(24, 'hours').toDate(); // 24 hours


            const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

            let emailSent = true;
            try {
                await EmailUtils.sendPasswordResetEmail({
                    email: user.email,
                    resetLink
                });
            } catch (emailError) {
                emailSent = false;
            }

            return {
                message: emailSent
                    ? 'Password reset email sent successfully'
                    : 'Password reset token generated but email could not be sent',
                token: !emailSent ? resetToken : undefined
            };
        } catch (error) {
            throw error;
        }
    }

    async resetPassword(token, newPassword) {
        try {

            const resetToken = await prisma.passwordResetToken.findFirst({
                where: {
                    token,
                    expiresAt: {
                        gt: moment().toDate()
                    }
                },
                include: {
                    user: true
                }
            });

            if (!resetToken) {
                throw ErrorFactory.notFound('Invalid or expired reset token');
            }

            const user = resetToken.user;

            const hashedPassword = await PasswordUtils.hash(newPassword);

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


            try {
                await EmailUtils.sendPasswordChangedEmail({
                    email: user.email
                });
            } catch (emailError) {
      
                // Don't throw error here as password was already changed
            }

            return { message: 'Password reset successfully' };
        } catch (error) {
     
            throw error;
        }
    }

    async changePassword(userId, oldPassword, newPassword) {
        try {

            // Ambil data user
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw ErrorFactory.notFound('User tidak ditemukan');
            }

            // Verifikasi password lama
            const isValidOldPassword = await PasswordUtils.verify(oldPassword, user.password);

            if (!isValidOldPassword) {
                throw ErrorFactory.unauthorized('Password lama tidak valid');
            }

            // Hash password baru
            const hashedNewPassword = await PasswordUtils.hash(newPassword);

            // Update password
            await prisma.user.update({
                where: { id: userId },
                data: {
                    password: hashedNewPassword
                }
            });


            // Kirim notifikasi email (optional, tidak akan throw error jika gagal)
            try {
                await EmailUtils.sendPasswordChangedEmail({
                    email: user.email
                });
            } catch (emailError) {
    
                // Don't throw error here as password was already changed
            }

            return { message: 'Password berhasil diubah' };
        } catch (error) {

            throw error;
        }
    }

    async login(email, password) {
        if (!email || !password) {
            throw ErrorFactory.badRequest('Email dan password harus diisi');
        }

        try {
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase().trim() },
                include: {
                    siswa: true,
                    guru: true,
                    admin: true
                }
            });

            if (!user) {
                throw ErrorFactory.unauthorized('Email atau password salah');
            }

            const isValidPassword = await PasswordUtils.verify(password, user.password);

            if (!isValidPassword) {
                throw ErrorFactory.unauthorized('Email atau password salah');
            }

            // Get nama based on user role
            let nama = '';
            if (user.role === 'SISWA' && user.siswa) {
                nama = user.siswa.namaMurid;
            } else if (user.role === 'GURU' && user.guru) {
                nama = user.guru.nama;
            } else if (user.role === 'ADMIN' && user.admin) {
                nama = user.admin.nama;
            } else if (user.role === 'SUPER_ADMIN') {
                nama = 'Super Admin';
            } else if (user.role === 'ADMIN_SURAU') {
                nama = 'Admin Surau';
            }

            const token = await TokenUtils.generateToken(user.id);

            return {
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    nama: nama,
                    role: user.role
                }
            };
        } catch (error) {
            throw error;
        }
    }

    async logout(token) {
        try {
            return await TokenUtils.revokeToken(token);
        } catch (error) {
            throw error;
        }
    }

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

            // Hanya bisa membuat role ADMIN
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

    async getAvailableRoles() {
        try {
            // Hanya return role ADMIN untuk create admin
            return ['ADMIN'];
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

            return await PrismaUtils.paginate(prisma.admin, {
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

            // Prevent self-deletion
            if (admin.userId === requestUserId) {
                throw ErrorFactory.forbidden('Tidak dapat menghapus akun admin sendiri');
            }

            await prisma.$transaction(async (tx) => {
                await tx.admin.delete({ where: { id: adminId } });
                await tx.token.deleteMany({ where: { userId: admin.userId } });
                await tx.user.delete({ where: { id: admin.userId } });
            });

            return true;
        } catch (error) {
            throw error;
        }
    }

    async checkRoleByRfid(rfid) {
        try {
            const user = await prisma.user.findUnique({
                where: { rfid },
                select: {
                    role: true
                }
            });

            if (!user) {
                throw ErrorFactory.notFound('RFID tidak ditemukan');
            }

            return {
                role: user.role
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new AuthService();