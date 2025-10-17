const { prisma } = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const CommonServiceUtils = require('../../lib/utils/common.service.utils');

class RfidService {
    async searchUser(filters = {}) {
        try {
            const { search, role, page = 1, limit = 10 } = filters;

            let users = [];

            if (!role || role === 'GURU') {
                const guruWhere = {};
                if (search) {
                    guruWhere.OR = [
                        { nama: { contains: search } },
                        { nip: { contains: search } },
                        { user: { email: { contains: search } } }
                    ];
                }

                const gurus = await prisma.guru.findMany({
                    where: guruWhere,
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                rfid: true,
                                role: true
                            }
                        }
                    },
                    orderBy: { nama: 'asc' }
                });

                users.push(...gurus.map(guru => ({
                    userId: guru.user.id,
                    id: guru.id,
                    nama: guru.nama,
                    identifier: guru.nip || guru.id,
                    email: guru.user.email,
                    role: guru.user.role,
                    rfid: guru.user.rfid,
                    hasRfid: !!guru.user.rfid
                })));
            }

            if (!role || role === 'SISWA') {
                const siswaWhere = {};
                if (search) {
                    siswaWhere.OR = [
                        { namaMurid: { contains: search } },
                        { namaPanggilan: { contains: search } },
                        { nis: { contains: search } },
                        { user: { email: { contains: search } } }
                    ];
                }

                const siswas = await prisma.siswa.findMany({
                    where: siswaWhere,
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                rfid: true,
                                role: true
                            }
                        }
                    },
                    orderBy: { namaMurid: 'asc' }
                });

                users.push(...siswas.map(siswa => ({
                    userId: siswa.user.id,
                    id: siswa.id,
                    nama: siswa.namaMurid,
                    identifier: siswa.nis || siswa.id,
                    email: siswa.user.email,
                    role: siswa.user.role,
                    rfid: siswa.user.rfid,
                    hasRfid: !!siswa.user.rfid
                })));
            }

            // Manual pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedUsers = users.slice(startIndex, endIndex);

            const totalItems = users.length;
            const totalPages = CommonServiceUtils.calculateTotalPages(totalItems, limit);

            return {
                data: paginatedUsers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalItems,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw error;
        }
    }

    async registerRfid(userId, rfidCode) {
        try {
            // Check if user exists
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    guru: { select: { id: true, nama: true } },
                    siswa: { select: { id: true, namaMurid: true } }
                }
            });

            if (!user) {
                throw ErrorFactory.notFound(`User dengan ID ${userId} tidak ditemukan`);
            }

            // Check if user already has RFID
            if (user.rfid) {
                throw ErrorFactory.badRequest(`User sudah memiliki RFID: ${user.rfid}`);
            }

            // Check if RFID already exists
            const existingRfid = await prisma.user.findUnique({
                where: { rfid: rfidCode }
            });

            if (existingRfid) {
                throw ErrorFactory.badRequest(`RFID ${rfidCode} sudah terdaftar untuk user lain`);
            }

            // Update user with RFID
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { rfid: rfidCode },
                include: {
                    guru: { select: { id: true, nama: true } },
                    siswa: { select: { id: true, namaMurid: true } }
                }
            });

            const userName = updatedUser.guru?.nama || updatedUser.siswa?.namaMurid || 'Unknown';
            
            return {
                userId: updatedUser.id,
                nama: userName,
                email: updatedUser.email,
                role: updatedUser.role,
                rfid: updatedUser.rfid,
                registeredAt: new Date()
            };
        } catch (error) {
            throw error;
        }
    }

    async updateRfid(userId, newRfidCode) {
        try {
            // Check if user exists
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    guru: { select: { id: true, nama: true } },
                    siswa: { select: { id: true, namaMurid: true } }
                }
            });

            if (!user) {
                throw ErrorFactory.notFound(`User dengan ID ${userId} tidak ditemukan`);
            }

            if (!user.rfid) {
                throw new BadRequestError('User belum memiliki RFID yang terdaftar');
            }

            // Check if new RFID already exists
            const existingRfid = await prisma.user.findFirst({
                where: {
                    rfid: newRfidCode,
                    id: { not: userId }
                }
            });

            if (existingRfid) {
                throw ErrorFactory.badRequest(`RFID ${newRfidCode} sudah terdaftar untuk user lain`);
            }

            const oldRfid = user.rfid;

            // Update user with new RFID
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { rfid: newRfidCode },
                include: {
                    guru: { select: { id: true, nama: true } },
                    siswa: { select: { id: true, namaMurid: true } }
                }
            });

            const userName = updatedUser.guru?.nama || updatedUser.siswa?.namaMurid || 'Unknown';
            
            return {
                userId: updatedUser.id,
                nama: userName,
                email: updatedUser.email,
                role: updatedUser.role,
                oldRfid: oldRfid,
                newRfid: updatedUser.rfid,
                updatedAt: new Date()
            };
        } catch (error) {
            throw error;
        }
    }

    async deleteRfid(userId) {
        try {
            // Check if user exists
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    guru: { select: { id: true, nama: true } },
                    siswa: { select: { id: true, namaMurid: true } }
                }
            });

            if (!user) {
                throw ErrorFactory.notFound(`User dengan ID ${userId} tidak ditemukan`);
            }

            if (!user.rfid) {
                throw new BadRequestError('User tidak memiliki RFID yang terdaftar');
            }

            const deletedRfid = user.rfid;

            // Remove RFID from user
            await prisma.user.update({
                where: { id: userId },
                data: { rfid: null }
            });

            const userName = user.guru?.nama || user.siswa?.namaMurid || 'Unknown';
            
            return {
                userId: user.id,
                nama: userName,
                email: user.email,
                role: user.role,
                deletedRfid: deletedRfid,
                deletedAt: new Date()
            };
        } catch (error) {
            throw error;
        }
    }

    async getRfidList(filters = {}) {
        try {
            const { search, role, hasRfid, page = 1, limit = 10 } = filters;

            let users = [];

            if (!role || role === 'GURU') {
                const guruWhere = {};
                if (search) {
                    guruWhere.OR = [
                        { nama: { contains: search } },
                        { nip: { contains: search } },
                        { user: { email: { contains: search } } }
                    ];
                }

                if (hasRfid !== undefined) {
                    if (hasRfid) {
                        guruWhere.user = { ...guruWhere.user, rfid: { not: null } };
                    } else {
                        guruWhere.user = { ...guruWhere.user, rfid: null };
                    }
                }

                const gurus = await prisma.guru.findMany({
                    where: guruWhere,
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                rfid: true,
                                role: true,
                                updatedAt: true
                            }
                        }
                    },
                    orderBy: { nama: 'asc' }
                });

                users.push(...gurus.map(guru => ({
                    userId: guru.user.id,
                    id: guru.id,
                    nama: guru.nama,
                    identifier: guru.nip || guru.id,
                    email: guru.user.email,
                    role: guru.user.role,
                    rfid: guru.user.rfid,
                    hasRfid: !!guru.user.rfid,
                    lastUpdated: guru.user.updatedAt
                })));
            }

            if (!role || role === 'SISWA') {
                const siswaWhere = {};
                if (search) {
                    siswaWhere.OR = [
                        { namaMurid: { contains: search } },
                        { namaPanggilan: { contains: search } },
                        { nis: { contains: search } },
                        { user: { email: { contains: search } } }
                    ];
                }

                if (hasRfid !== undefined) {
                    if (hasRfid) {
                        siswaWhere.user = { ...siswaWhere.user, rfid: { not: null } };
                    } else {
                        siswaWhere.user = { ...siswaWhere.user, rfid: null };
                    }
                }

                const siswas = await prisma.siswa.findMany({
                    where: siswaWhere,
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                rfid: true,
                                role: true,
                                updatedAt: true
                            }
                        }
                    },
                    orderBy: { namaMurid: 'asc' }
                });

                users.push(...siswas.map(siswa => ({
                    userId: siswa.user.id,
                    id: siswa.id,
                    nama: siswa.namaMurid,
                    identifier: siswa.nis || siswa.id,
                    email: siswa.user.email,
                    role: siswa.user.role,
                    rfid: siswa.user.rfid,
                    hasRfid: !!siswa.user.rfid,
                    lastUpdated: siswa.user.updatedAt
                })));
            }

            // Filter by hasRfid if specified
            if (hasRfid !== undefined) {
                users = users.filter(user => user.hasRfid === hasRfid);
            }

            // Manual pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedUsers = users.slice(startIndex, endIndex);

            const totalItems = users.length;
            const totalPages = CommonServiceUtils.calculateTotalPages(totalItems, limit);

            return {
                data: paginatedUsers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalItems,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                },
                summary: {
                    totalUsers: users.length,
                    usersWithRfid: users.filter(u => u.hasRfid).length,
                    usersWithoutRfid: users.filter(u => !u.hasRfid).length
                }
            };
        } catch (error) {
            throw error;
        }
    }

  
    
}

module.exports = new RfidService(); 