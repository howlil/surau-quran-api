const { PrismaClient } = require('../../generated/prisma');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const prismaClient = new PrismaClient();

// Production data constants
const PRODUCTION_PROGRAMS = [
    // Group Programs
    { name: 'PRA BTA', type: 'GROUP', spp: 250000 },
    { name: 'BTA LVL 1', type: 'GROUP', spp: 250000 },
    { name: 'BTA LVL 2 & PRA Tahsin', type: 'GROUP', spp: 250000 },
    { name: 'TAHSIN', type: 'GROUP', spp: 250000 },
    { name: 'TAHFIDZ', type: 'GROUP', spp: 250000 },
    // Private Programs
    { name: 'Private Mandiri', type: 'PRIVATE', spp: 250000 },
    { name: 'Private Bersaudara', type: 'PRIVATE', spp: 250000 },
    { name: 'Private Sharing', type: 'PRIVATE', spp: 250000 }
];

const PRODUCTION_KELAS = [
    'Kelas Nabawi',
    'Kelas Madinah',
    'Kelas Makkah',
    'Kelas Al-Aqsa',
    'Kelas Al-Hidayah',
    'Kelas Online'
];

// Jam mengajar berdasarkan aturan kerja: 10:00 - 20:45 WIB, 1 SKS = 1.5 jam
const PRODUCTION_JAM_MENGAJAR = [
    { jamMulai: '10:00', jamSelesai: '11:30' }, // SKS 1
    { jamMulai: '11:30', jamSelesai: '13:00' }, // SKS 2 (termasuk jam istirahat)
    { jamMulai: '13:00', jamSelesai: '14:30' }, // SKS 3
    { jamMulai: '14:30', jamSelesai: '16:00' }, // SKS 4
    { jamMulai: '16:00', jamSelesai: '17:30' }, // SKS 5
    { jamMulai: '17:30', jamSelesai: '19:00' }, // SKS 6 (termasuk jam istirahat)
    { jamMulai: '19:00', jamSelesai: '20:30' }, // SKS 7
    { jamMulai: '20:30', jamSelesai: '20:45' }  // SKS 8 (kelas terakhir)
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
            jamMengajar: [],
            adminUser: null
        };
    }

    async seed() {
        try {
            console.log('🌱 Starting production seeding...');

            // Step 1: Create Admin User
            await this.createAdminUser();
            console.log('✅ Admin user created');

            // Step 2: Create Super Admin User
            await this.createSuperAdminUser();
            console.log('✅ Super Admin user created');

            // Step 3: Create Programs
            await this.createPrograms();
            console.log('✅ Programs created');

            // Step 4: Create Kelas
            await this.createKelas();
            console.log('✅ Kelas created');

            // Step 5: Create Jam Mengajar
            await this.createJamMengajar();
            console.log('✅ Jam mengajar created');

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
            for (const programData of PRODUCTION_PROGRAMS) {
                // Check if program already exists
                const existingProgram = await prismaClient.program.findFirst({
                    where: {
                        namaProgram: programData.name
                    }
                });

                if (existingProgram) {
                    console.log(`⚠️ Program "${programData.name}" already exists, skipping...`);
                    this.data.programs.push(existingProgram);
                    continue;
                }

                // Create program
                const program = await prismaClient.program.create({
                    data: {
                        id: uuidv4(),
                        namaProgram: programData.name,
                        deskripsi: `Program ${programData.name} - Surau Quran Center`,
                        biayaSpp: programData.spp,
                        tipeProgram: programData.type,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });

                this.data.programs.push(program);
                console.log(`📚 Program created: ${program.namaProgram} (${program.tipeProgram})`);
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
                        ipAddressHikvision: ipAddressHikvision,
                        createdAt: new Date(),
                        updatedAt: new Date()
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

    async createJamMengajar() {
        try {
            for (const jamData of PRODUCTION_JAM_MENGAJAR) {
                // Check if jam mengajar already exists
                const existingJam = await prismaClient.jamMengajar.findFirst({
                    where: {
                        jamMulai: jamData.jamMulai,
                        jamSelesai: jamData.jamSelesai
                    }
                });

                if (existingJam) {
                    console.log(`⚠️ Jam mengajar "${jamData.jamMulai} - ${jamData.jamSelesai}" already exists, skipping...`);
                    this.data.jamMengajar.push(existingJam);
                    continue;
                }

                // Create jam mengajar
                const jamMengajar = await prismaClient.jamMengajar.create({
                    data: {
                        id: uuidv4(),
                        jamMulai: jamData.jamMulai,
                        jamSelesai: jamData.jamSelesai,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });

                this.data.jamMengajar.push(jamMengajar);
                console.log(`⏰ Jam mengajar created: ${jamMengajar.jamMulai} - ${jamMengajar.jamSelesai}`);
            }
        } catch (error) {
            console.error('❌ Failed to create jam mengajar:', error.message);
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
