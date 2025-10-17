const { prisma } = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const TokenUtils = require('../../lib/utils/token.utils');
const PasswordUtils = require('../../lib/utils/password.utils');
const EmailUtils = require('../../lib/utils/email.utils');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const CommonServiceUtils = require('../../lib/utils/common.service.utils');
const moment = require('moment');

class AuthService {
    async #generateResetToken(userId) {
        return TokenUtils.generatePasswordResetToken(userId);
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
            // Verify password reset token
            let decoded;
            try {
                decoded = TokenUtils.verifyPasswordResetToken(token);
            } catch (tokenError) {
                throw ErrorFactory.notFound(tokenError.message);
            }

            const userId = decoded.userId;

            // Get user
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw ErrorFactory.notFound('User not found');
            }

            // Hash new password
            const hashedPassword = await PasswordUtils.hash(newPassword);

            // Update password
            await prisma.user.update({
                where: { id: userId },
                data: {
                    password: hashedPassword
                }
            });

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

            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw ErrorFactory.notFound('User tidak ditemukan');
            }

            const isValidOldPassword = await PasswordUtils.verify(oldPassword, user.password);

            if (!isValidOldPassword) {
                throw ErrorFactory.unauthorized('Password lama tidak valid');
            }

            const hashedNewPassword = await PasswordUtils.hash(newPassword);

            await prisma.user.update({
                where: { id: userId },
                data: {
                    password: hashedNewPassword
                }
            });


            try {
                await EmailUtils.sendPasswordChangedEmail({
                    email: user.email
                });
            } catch (emailError) {

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