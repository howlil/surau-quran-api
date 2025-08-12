const { PrismaClient } = require('../../generated/prisma');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const prismaClient = new PrismaClient();

// Production data constants
const PRODUCTION_PROGRAMS = [
    'PRA BTA',
    'BTA LVL 1',
    'BTA LVL 2 & PRA Tahsin',
    'TAHSIN',
    'TAHFIDZ'
];

const PRODUCTION_KELAS = [
    'Kelas Nabawi',
    'Kelas Madinah',
    'Kelas Makkah',
    'Kelas Al-Aqsa',
    'Kelas Al-Hidayah',
    'Kelas Online'
];

const ADMIN_USER = {
    email: 'surauqurancenter@gmail.com',
    password: 'Padangp@sir7',
    role: 'AdminSurau'
};

class ProductionSeeder {
    constructor() {
        this.data = {
            programs: [],
            kelas: [],
            adminUser: null
        };
    }

    async seed() {
        try {
            console.log('🌱 Starting production seeding...');

            // Step 1: Create Admin User
            await this.createAdminUser();
            console.log('✅ Admin user created');

            // Step 2: Create Programs
            await this.createPrograms();
            console.log('✅ Programs created');

            // Step 3: Create Kelas
            await this.createKelas();
            console.log('✅ Kelas created');

            console.log('🎉 Production seeding completed successfully!');
        } catch (error) {
            console.error('❌ Production seeding failed:', error.message);
            throw error;
        }
    }

    async createAdminUser() {
        try {
            // Check if admin user already exists
            const existingAdmin = await prismaClient.user.findFirst({
                where: {
                    email: ADMIN_USER.email
                }
            });

            if (existingAdmin) {
                console.log('⚠️ Admin user already exists, skipping...');
                this.data.adminUser = existingAdmin;
                return;
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(ADMIN_USER.password, 10);

            // Create admin user
            const adminUser = await prismaClient.user.create({
                data: {
                    id: uuidv4(),
                    email: ADMIN_USER.email,
                    password: hashedPassword,
                    role: ADMIN_USER.role,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });

            this.data.adminUser = adminUser;
            console.log(`👤 Admin user created: ${adminUser.email}`);
        } catch (error) {
            console.error('❌ Failed to create admin user:', error.message);
            throw error;
        }
    }

    async createPrograms() {
        try {
            for (const programName of PRODUCTION_PROGRAMS) {
                // Check if program already exists
                const existingProgram = await prismaClient.program.findFirst({
                    where: {
                        nama: programName
                    }
                });

                if (existingProgram) {
                    console.log(`⚠️ Program "${programName}" already exists, skipping...`);
                    this.data.programs.push(existingProgram);
                    continue;
                }

                // Create program
                const program = await prismaClient.program.create({
                    data: {
                        id: uuidv4(),
                        nama: programName,
                        deskripsi: `Program ${programName} - Surau Quran Center`,
                        cover: null,
                        deskripsiCover: null,
                        biayaSpp: 0, // Set default value, can be updated later
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });

                this.data.programs.push(program);
                console.log(`📚 Program created: ${program.nama}`);
            }
        } catch (error) {
            console.error('❌ Failed to create programs:', error.message);
            throw error;
        }
    }

    async createKelas() {
        try {
            for (const kelasName of PRODUCTION_KELAS) {
                // Check if kelas already exists
                const existingKelas = await prismaClient.kelas.findFirst({
                    where: {
                        nama: kelasName
                    }
                });

                if (existingKelas) {
                    console.log(`⚠️ Kelas "${kelasName}" already exists, skipping...`);
                    this.data.kelas.push(existingKelas);
                    continue;
                }

                // Determine if it's online class
                const isOnline = kelasName === 'Kelas Online';
                const ipAddressHikvision = isOnline ? null : '192.168.1.100'; // Default IP for physical classes

                // Create kelas
                const kelas = await prismaClient.kelas.create({
                    data: {
                        id: uuidv4(),
                        nama: kelasName,
                        deskripsi: `Kelas ${kelasName} - Surau Quran Center`,
                        kapasitas: isOnline ? 50 : 20, // Online can have more students
                        ipAddressHikvision: ipAddressHikvision,
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });

                this.data.kelas.push(kelas);
                console.log(`🏫 Kelas created: ${kelas.nama}`);
            }
        } catch (error) {
            console.error('❌ Failed to create kelas:', error.message);
            throw error;
        }
    }

    async cleanup() {
        try {
            await prismaClient.$disconnect();
            console.log('🔌 Database connection closed');
        } catch (error) {
            console.error('❌ Failed to close database connection:', error.message);
        }
    }
}

module.exports = new ProductionSeeder();
