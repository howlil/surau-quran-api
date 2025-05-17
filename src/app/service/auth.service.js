const { prisma } = require('../../lib/config/prisma.config');
const { UnauthorizedError, ConflictError } = require('../../lib/http/errors.http');
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

    async createAdmin(adminData) {
        return await prisma.$transaction(async (tx) => {
            const { email, password, nama } = adminData;

            const existingUser = await tx.user.findUnique({
                where: { email }
            });

            if (existingUser) {
                throw new ConflictError(`Email ${email} sudah terdaftar`);
            }

            const hashedPassword = await PasswordUtils.hash(password);

            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: 'ADMIN'
                }
            });

            const admin = await tx.admin.create({
                data: {
                    userId: user.id,
                    nama
                }
            });

            return {
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                admin: {
                    id: admin.id,
                    nama: admin.nama
                }
            };
        });
    }

    async createGuru(guruData) {
        return await prisma.$transaction(async (tx) => {
            const { email, password, nama, noWhatsapp, alamat, jenisKelamin,
                keahlian, pendidikanTerakhir, noRekening, namaBank, tarifPerJam } = guruData;

            const existingUser = await tx.user.findUnique({
                where: { email }
            });

            if (existingUser) {
                throw new ConflictError(`Email ${email} sudah terdaftar`);
            }

            const hashedPassword = await PasswordUtils.hash(password);

            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: 'GURU'
                }
            });

            const guru = await tx.guru.create({
                data: {
                    userId: user.id,
                    nama,
                    noWhatsapp,
                    alamat,
                    jenisKelamin,
                    keahlian,
                    pendidikanTerakhir,
                    noRekening,
                    namaBank,
                    tarifPerJam
                }
            });

            return {
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                guru: {
                    id: guru.id,
                    nama: guru.nama
                }
            };
        });
    }

    async verifyToken(token) {
        return await TokenUtils.verifyToken(token);
    }
}

module.exports = new AuthService();