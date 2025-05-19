
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, ConflictError } = require('../../lib/http/errors.http');
const PrismaUtils = require('../../lib/utils/prisma.utils');
const PasswordUtils = require('../../lib/utils/password.utils');

class GuruService {
  async create(data) {
    try {
      const { email, password, ...guruData } = data;

      return await PrismaUtils.transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          throw new ConflictError(`User dengan email ${email} sudah ada`);
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
            ...guruData,
            userId: user.id
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true
              }
            }
          }
        });

        logger.info(`Created guru with ID: ${guru.id}`);
        return guru;
      });
    } catch (error) {
      logger.error('Error creating guru:', error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const guru = await prisma.guru.findUnique({
        where: { id },
        include: {
          user: true
        }
      });

      if (!guru) {
        throw new NotFoundError(`Guru dengan ID ${id} tidak ditemukan`);
      }

      const { email, password, ...guruData } = data;

      return await PrismaUtils.transaction(async (tx) => {
        if (email && email !== guru.user.email) {
          const existingUser = await tx.user.findFirst({
            where: {
              email,
              id: { not: guru.userId }
            }
          });

          if (existingUser) {
            throw new ConflictError(`User dengan email ${email} sudah ada`);
          }

          await tx.user.update({
            where: { id: guru.userId },
            data: { email }
          });
        }

        if (password) {
          const hashedPassword = await PasswordUtils.hash(password);
          await tx.user.update({
            where: { id: guru.userId },
            data: { password: hashedPassword }
          });
        }

        const updated = await tx.guru.update({
          where: { id },
          data: guruData,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true
              }
            }
          }
        });

        logger.info(`Updated guru with ID: ${id}`);
        return updated;
      });
    } catch (error) {
      logger.error(`Error updating guru with ID ${id}:`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const guru = await prisma.guru.findUnique({
        where: { id },
        include: {
          kelasProgram: true,
          payroll: true
        }
      });

      if (!guru) {
        throw new NotFoundError(`Guru dengan ID ${id} tidak ditemukan`);
      }

      if (guru.kelasProgram.length > 0) {
        throw new ConflictError('Guru sedang mengajar di kelas program dan tidak dapat dihapus');
      }

      if (guru.payroll.length > 0) {
        throw new ConflictError('Guru memiliki data payroll dan tidak dapat dihapus');
      }

      await PrismaUtils.transaction(async (tx) => {
        await tx.guru.delete({
          where: { id }
        });

        await tx.user.delete({
          where: { id: guru.userId }
        });
      });

      logger.info(`Deleted guru with ID: ${id}`);
      return { id };
    } catch (error) {
      logger.error(`Error deleting guru with ID ${id}:`, error);
      throw error;
    }
  }

  async getById(id) {
    try {
      const guru = await prisma.guru.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          },
          kelasProgram: {
            include: {
              kelas: true,
              program: true,
              jamMengajar: true
            }
          }
        }
      });

      if (!guru) {
        throw new NotFoundError(`Guru dengan ID ${id} tidak ditemukan`);
      }

      return guru;
    } catch (error) {
      logger.error(`Error getting guru with ID ${id}:`, error);
      throw error;
    }
  }

  async getAll(filters = {}) {
    try {
      const { page = 1, limit = 10, nama, noWhatsapp, jenisKelamin, keahlian } = filters;
      
      const where = {};
      if (nama) {
        where.nama = { contains: nama, mode: 'insensitive' };
      }
      if (noWhatsapp) {
        where.noWhatsapp = { contains: noWhatsapp };
      }
      if (jenisKelamin) {
        where.jenisKelamin = jenisKelamin;
      }
      if (keahlian) {
        where.keahlian = { contains: keahlian, mode: 'insensitive' };
      }

      return await PrismaUtils.paginate(prisma.guru, {
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
        orderBy: { nama: 'asc' }
      });
    } catch (error) {
      logger.error('Error getting all guru:', error);
      throw error;
    }
  }

  async getProfile(userId) {
    try {
      const guru = await prisma.guru.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          },
          kelasProgram: {
            include: {
              kelas: true,
              program: true,
              jamMengajar: true
            }
          }
        }
      });

      if (!guru) {
        throw new NotFoundError('Profil guru tidak ditemukan');
      }

      return guru;
    } catch (error) {
      logger.error(`Error getting guru profile for user ${userId}:`, error);
      throw error;
    }
  }

  async updateProfile(userId, data) {
    try {
      const guru = await prisma.guru.findUnique({
        where: { userId }
      });

      if (!guru) {
        throw new NotFoundError('Profil guru tidak ditemukan');
      }

      const { email, ...guruData } = data;

      return await PrismaUtils.transaction(async (tx) => {
        if (email) {
          const existingUser = await tx.user.findFirst({
            where: {
              email,
              id: { not: userId }
            }
          });

          if (existingUser) {
            throw new ConflictError(`Email ${email} sudah digunakan`);
          }

          await tx.user.update({
            where: { id: userId },
            data: { email }
          });
        }

        const updated = await tx.guru.update({
          where: { userId },
          data: guruData,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true
              }
            }
          }
        });

        logger.info(`Updated guru profile for user: ${userId}`);
        return updated;
      });
    } catch (error) {
      logger.error(`Error updating guru profile for user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = new GuruService();