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
    role: 'ADMIN_SURAU'
};


const SUPER_ADMIN_USER = {
    email: 'superadmin@gmail.com',
    password: 'Padangp@sir7',
    role: 'SUPER_ADMIN'
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
            // await this.createPrograms();
            console.log('✅ Programs created');

            // Step 3: Create Kelas
            // await this.createKelas();
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
                    role: ADMIN_USER.role
                }
            });

            await prismaClient.admin.create({
                data: {
                    id: uuidv4(),
                    userId: adminUser.id,
                    nama: 'Admin Surau'
                }
            });

            this.data.adminUser = adminUser;
            console.log(`👤 Admin user created: ${adminUser.email}`);
        } catch (error) {
            console.error('❌ Failed to create admin user:', error.message);
            throw error;
        }
    }

    async createSuperAdminUser() {
        try {
            const existingSuperAdmin = await prismaClient.user.findFirst({
                where: {
                    email: SUPER_ADMIN_USER.email
                }
            });

            if (existingSuperAdmin) {
                console.log('⚠️ Super admin user already exists, skipping...');
                this.data.superAdminUser = existingSuperAdmin;
                return;
            }

            const hashedPassword = await bcrypt.hash(SUPER_ADMIN_USER.password, 10);

            const superAdminUser = await prismaClient.user.create({
                data: {
                    id: uuidv4(),
                    email: SUPER_ADMIN_USER.email,
                    password: hashedPassword,
                    role: SUPER_ADMIN_USER.role
                }
            });

            this.data.superAdminUser = superAdminUser;
            console.log(`👤 Super admin user created: ${superAdminUser.email}`);

            await prismaClient.admin.create({
                data: {
                    id: uuidv4(),
                    userId: superAdminUser.id,
                    nama: 'Super Admin'
                }
            });

            console.log(`👤 Super admin user created: ${superAdminUser.email}`);
            
        } catch (error) {
            console.error('❌ Failed to create super admin user:', error.message);
            throw error;
        }
    }

    async createPrograms() {
        try {
            for (const programName of PRODUCTION_PROGRAMS) {
                // Check if program already exists
                const existingProgram = await prismaClient.program.findFirst({
                    where: {
                        namaProgram: programName
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
                        namaProgram: programName,
                        deskripsi: `Program ${programName} - Surau Quran Center`
                    }
                });

                this.data.programs.push(program);
                console.log(`📚 Program created: ${program.namaProgram}`);
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
                        namaKelas: kelasName
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
                        namaKelas: kelasName,
                        ipAddressHikvision: ipAddressHikvision
                    }
                });

                this.data.kelas.push(kelas);
                console.log(`🏫 Kelas created: ${kelas.namaKelas}`);
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
