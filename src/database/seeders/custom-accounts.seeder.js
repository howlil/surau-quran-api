const { logger } = require('../../lib/config/logger.config');
const { prisma } = require('../../lib/config/prisma.config');
const bcrypt = require('bcrypt');

class CustomAccountsSeeder {
    static async seed() {
        try {
            logger.info('Seeding custom accounts...');

            const password = '@Test123';
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create custom admin account
            const adminUser = await this.createUser('admin@example.com', hashedPassword, 'ADMIN');
            const admin = await this.createAdmin(adminUser.id, 'Admin Utama');

            // Create custom guru account
            const guruUser = await this.createUser('guru@example.com', hashedPassword, 'GURU');
            const guru = await this.createGuru(guruUser.id, 'Guru Utama');

            // Create custom siswa account
            const siswaUser = await this.createUser('siswa@example.com', hashedPassword, 'SISWA');
            const siswa = await this.createSiswa(siswaUser.id, 'Siswa Utama');

            logger.info('Custom accounts created successfully');

            return {
                adminUser,
                admin,
                guruUser,
                guru,
                siswaUser,
                siswa
            };
        } catch (error) {
            logger.error('Error seeding custom accounts:', error);
            throw error;
        }
    }

    static async createUser(email, hashedPassword, role) {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            logger.info(`User with email ${email} already exists, skipping creation`);
            return existingUser;
        }

        // Create new user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role
            }
        });

        logger.info(`Created custom ${role} user with email ${email}`);
        return user;
    }

    static async createAdmin(userId, nama) {
        // Check if admin profile already exists
        const existingAdmin = await prisma.admin.findUnique({
            where: { userId }
        });

        if (existingAdmin) {
            logger.info(`Admin profile for user ${userId} already exists, skipping creation`);
            return existingAdmin;
        }

        // Create admin profile
        const admin = await prisma.admin.create({
            data: {
                userId,
                nama
            }
        });

        logger.info(`Created custom admin profile for ${nama}`);
        return admin;
    }

    static async createGuru(userId, nama) {
        // Check if guru profile already exists
        const existingGuru = await prisma.guru.findUnique({
            where: { userId }
        });

        if (existingGuru) {
            logger.info(`Guru profile for user ${userId} already exists, skipping creation`);
            return existingGuru;
        }

        // Create guru profile
        const guru = await prisma.guru.create({
            data: {
                userId,
                nama,
                nip: '123456',
                tarifPerJam: 100000,
                jenisKelamin: 'LAKI_LAKI',
                noWhatsapp: '6281234567890',
                alamat: 'Jl. Contoh No. 123',
                keahlian: 'Tahfidz Quran',
                pendidikanTerakhir: 'S1 Pendidikan Agama Islam'
            }
        });

        logger.info(`Created custom guru profile for ${nama}`);
        return guru;
    }

    static async createSiswa(userId, nama) {
        // Check if siswa profile already exists
        const existingSiswa = await prisma.siswa.findUnique({
            where: { userId }
        });

        if (existingSiswa) {
            logger.info(`Siswa profile for user ${userId} already exists, skipping creation`);
            return existingSiswa;
        }

        // Create siswa profile
        const siswa = await prisma.siswa.create({
            data: {
                userId,
                namaMurid: nama,
                namaPanggilan: nama.split(' ')[0],
                jenisKelamin: 'LAKI_LAKI',
                tanggalLahir: '2005-01-01',
                alamat: 'Jl. Contoh No. 456',
                strataPendidikan: 'SMA',
                kelasSekolah: 'XI',
                namaSekolah: 'SMA Islam Teladan',
                noWhatsapp: '6281234567891',
                namaOrangTua: 'Orang Tua Siswa',
                isRegistered: true
            }
        });

        logger.info(`Created custom siswa profile for ${nama}`);
        return siswa;
    }
}

module.exports = CustomAccountsSeeder; 