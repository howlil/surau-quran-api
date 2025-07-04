const { PrismaClient } = require('../../generated/prisma');
const { faker } = require('@faker-js/faker');
const moment = require('moment');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Import Finance Factory
const FinanceFactory = require('../factories/finance.factory');

const prismaClient = new PrismaClient();

const TOTAL_RECORDS = 60; // Increased for more comprehensive data
const DEFAULT_PASSWORD = '@Test123';

// Updated shift times to match working hours (10:00 - 20:45)
const SHIFT_TIMES = [
    { start: '10:00', end: '11:30' }, // 1.5 hours per SKS
    { start: '13:00', end: '14:30' },
    { start: '15:00', end: '16:30' },
    { start: '17:00', end: '18:30' },
    { start: '19:00', end: '20:30' }
];

const PROGRAM_NAMES = [
    'PRA BTA',
    'BTA LVL 1',
    'BTA LVL 2 & PRA Tahsin',
    'TAHSIN',
    'TAHFIDZ'
];

const KELAS_NAMES = [
    'Kelas Nabawi',
    'Kelas Madinah',
    'Kelas Makkah',
    'Kelas Al-Aqsa',
    'Kelas Al-Hidayah'
];

// New constants for class types and rates
const CLASS_TYPES = {
    GROUP: { rate: 35000, weight: 0.7 },
    PRIVATE: { rate: 35000, weight: 0.2 },
    SUBSTITUTE: { rate: 25000, weight: 0.05 },
    ONLINE: { rate: 25000, weight: 0.05 }
};

// Attendance incentives and penalties
const ATTENDANCE_RULES = {
    INCENTIVE: 10000, // Per attendance with minimum 2 SKS
    LATE_PENALTY: 10000, // Per late instance
    ABSENT_NO_NOTICE_PENALTY: 20000, // Per absence without notice
    ABSENT_NO_LETTER_PENALTY: 10000 // Per absence without permission letter
};

class FakerSeeder {
    constructor() {
        this.users = {
            admins: [],
            gurus: [],
            siswas: []
        };
        this.data = {
            kelas: [],
            programs: [],
            jamMengajar: [],
            kelasProgram: [],
            vouchers: [],
            programSiswa: [],
            jadwalProgramSiswa: [],
            periodeSpp: [],
            pembayaran: [],
            xenditPayment: [],
            pendaftaran: [],
            absensiSiswa: [],
            absensiGuru: [],
            payroll: [],
            riwayatStatusSiswa: [],
            users: [],
            admins: [],
            gurus: [],
            siswas: [],
            programs: [],
            kelas: [],
            finance: [],
            testimoni: [],
            galeri: []
        };
    }

    generateDate(startYear = 2025, endYear = 2025) {
        const date = faker.date.between({
            from: `${startYear}-01-01`,
            to: `${endYear}-12-31`
        });
        return moment(date).format('DD-MM-YYYY');
    }

    generateTime() {
        return moment(faker.date.recent()).format('HH:mm');
    }

    async hashPassword(password = DEFAULT_PASSWORD) {
        return bcrypt.hash(password, 10);
    }

    async createUsers() {
        console.log('Creating users...');
        try {
            // Create default users with pattern example@[role].com
            const defaultUsers = [
                {
                    email: 'example@admin.com',
                    role: 'ADMIN',
                    profile: {
                        nama: 'Super Admin'
                    }
                },
                {
                    email: 'example@guru.com',
                    role: 'GURU',
                    profile: {
                        nama: 'Ustadz Example',
                        nip: '000001',
                        noWhatsapp: '081234567890',
                        alamat: 'Jl. Contoh No. 1',
                        jenisKelamin: 'LAKI_LAKI',
                        keahlian: 'Tahfidz',
                        pendidikanTerakhir: 'S1',
                        noRekening: '1234567890',
                        namaBank: 'BSI',
                        fotoProfile: null, // Some users won't have photos
                        suratKontrak: null
                    }
                },
                {
                    email: 'example@siswa.com',
                    role: 'SISWA',
                    profile: {
                        nis: '000001',
                        namaMurid: 'Siswa Example',
                        namaPanggilan: 'Example',
                        tanggalLahir: '01-01-2000',
                        jenisKelamin: 'LAKI_LAKI',
                        alamat: 'Jl. Contoh No. 2',
                        strataPendidikan: 'SMA',
                        kelasSekolah: '12',
                        namaSekolah: 'SMA Example',
                        namaOrangTua: 'Orang Tua Example',
                        namaPenjemput: 'Penjemput Example',
                        noWhatsapp: '081234567891',
                        isRegistered: true
                    }
                }
            ];

            // Create default users first
            for (const defaultUser of defaultUsers) {
                const userData = {
                    id: uuidv4(),
                    email: defaultUser.email,
                    password: await this.hashPassword(),
                    role: defaultUser.role,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                let user;
                if (defaultUser.role === 'ADMIN') {
                    user = await prismaClient.user.create({
                        data: {
                            ...userData,
                            admin: {
                                create: {
                                    ...defaultUser.profile,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                }
                            }
                        },
                        include: { admin: true }
                    });
                    this.users.admins.push(user);
                } else if (defaultUser.role === 'GURU') {
                    user = await prismaClient.user.create({
                        data: {
                            ...userData,
                            guru: {
                                create: {
                                    ...defaultUser.profile,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                }
                            }
                        },
                        include: { guru: true }
                    });
                    this.users.gurus.push(user);
                } else if (defaultUser.role === 'SISWA') {
                    user = await prismaClient.user.create({
                        data: {
                            ...userData,
                            siswa: {
                                create: {
                                    ...defaultUser.profile,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                }
                            }
                        },
                        include: { siswa: true }
                    });
                    this.users.siswas.push(user);
                }
            }

            // Create additional random users
            const userPromises = [];
            for (let i = 0; i < TOTAL_RECORDS; i++) {
                const password = await this.hashPassword();
                const hasPhoto = Math.random() > 0.3; // 70% chance to have a photo

                // Create Admin
                userPromises.push(
                    prismaClient.user.create({
                        data: {
                            id: uuidv4(),
                            email: `admin.${i + 1}@surauquran.com`,
                            password,
                            role: 'ADMIN',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            admin: {
                                create: {
                                    nama: faker.person.fullName(),
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                }
                            }
                        },
                        include: { admin: true }
                    })
                );

                // Create Guru with complete data
                userPromises.push(
                    prismaClient.user.create({
                        data: {
                            id: uuidv4(),
                            email: `guru.${i + 1}@surauquran.com`,
                            password,
                            role: 'GURU',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            guru: {
                                create: {
                                    nip: `${(i + 2).toString().padStart(6, '0')}`,
                                    nama: faker.person.fullName(),
                                    noWhatsapp: faker.phone.number('08##########'),
                                    alamat: faker.location.streetAddress(),
                                    jenisKelamin: Math.random() > 0.5 ? 'LAKI_LAKI' : 'PEREMPUAN',
                                    tanggalLahir: faker.date.between({ from: '1980-01-01', to: '2000-12-31' }).toISOString().split('T')[0],
                                    fotoProfile: hasPhoto ? `guru_${i + 1}.jpg` : null,
                                    keahlian: faker.helpers.arrayElement(['Tahfidz', 'Tajwid', 'Qiraat']),
                                    pendidikanTerakhir: faker.helpers.arrayElement(['S1', 'S2', 'S3']),
                                    noRekening: faker.finance.accountNumber(),
                                    namaBank: faker.helpers.arrayElement(['BCA', 'Mandiri', 'BNI', 'BSI']),
                                    suratKontrak: `kontrak_${i + 1}.pdf`,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                }
                            }
                        },
                        include: { guru: true }
                    })
                );

                // Create Siswa with some incomplete data
                userPromises.push(
                    prismaClient.user.create({
                        data: {
                            id: uuidv4(),
                            email: `siswa.${i + 1}@surauquran.com`,
                            password,
                            role: 'SISWA',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            siswa: {
                                create: {
                                    nis: `${(i + 2).toString().padStart(6, '0')}`,
                                    namaMurid: faker.person.fullName(),
                                    namaPanggilan: Math.random() > 0.2 ? faker.person.firstName() : null,
                                    tanggalLahir: this.generateDate(2000, 2015),
                                    jenisKelamin: Math.random() > 0.5 ? 'LAKI_LAKI' : 'PEREMPUAN',
                                    alamat: Math.random() > 0.1 ? faker.location.streetAddress() : null,
                                    strataPendidikan: faker.helpers.arrayElement(['SD', 'SMP', 'SMA', 'KULIAH']),
                                    kelasSekolah: Math.random() > 0.1 ? `${faker.number.int({ min: 1, max: 12 })}` : null,
                                    namaSekolah: Math.random() > 0.1 ? `${faker.company.name()} School` : null,
                                    namaOrangTua: faker.person.fullName(),
                                    namaPenjemput: Math.random() > 0.3 ? faker.person.fullName() : null,
                                    noWhatsapp: Math.random() > 0.1 ? faker.phone.number('08##########') : null,
                                    isRegistered: Math.random() > 0.2,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                }
                            }
                        },
                        include: { siswa: true }
                    })
                );
            }

            const createdUsers = await Promise.all(userPromises);
            createdUsers.forEach(user => {
                if (user.admin) this.users.admins.push(user);
                if (user.guru) this.users.gurus.push(user);
                if (user.siswa) this.users.siswas.push(user);
            });

            console.log(`Created ${this.users.admins.length} admins, ${this.users.gurus.length} gurus, and ${this.users.siswas.length} siswas`);
        } catch (error) {
            console.error('Error creating users:', error);
            throw error;
        }
    }

    async createMasterData() {
        console.log('Creating master data...');
        try {
            // Create Kelas
            for (const kelasName of KELAS_NAMES) {
                const kelas = await prismaClient.kelas.create({
                    data: {
                        namaKelas: kelasName,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
                this.data.kelas.push(kelas);
            }

            // Create Programs
            for (const programName of PROGRAM_NAMES) {
                const program = await prismaClient.program.create({
                    data: {
                        namaProgram: programName,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
                this.data.programs.push(program);
            }

            // Create Jam Mengajar
            for (const shift of SHIFT_TIMES) {
                const jamMengajar = await prismaClient.jamMengajar.create({
                    data: {
                        jamMulai: shift.start,
                        jamSelesai: shift.end,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
                this.data.jamMengajar.push(jamMengajar);
            }

            // Create Vouchers (some active, some not)
            for (let i = 0; i < TOTAL_RECORDS; i++) {
                const tipe = faker.helpers.arrayElement(['PERSENTASE', 'NOMINAL']);
                const nominal = tipe === 'PERSENTASE'
                    ? faker.number.int({ min: 5, max: 20 }) // 5%-20% for percentage
                    : faker.number.int({ min: 10000, max: 50000 }); // 10K-50K for nominal

                const voucher = await prismaClient.voucher.create({
                    data: {
                        kodeVoucher: `VOUCHER${(i + 1).toString().padStart(3, '0')}`,
                        namaVoucher: `${tipe === 'PERSENTASE' ? 'Diskon' : 'Cashback'} ${(i + 1).toString().padStart(3, '0')}`,
                        tipe,
                        nominal,
                        isActive: Math.random() > 0.2,
                        jumlahPenggunaan: faker.number.int({ min: 0, max: 100 }),
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
                this.data.vouchers.push(voucher);
            }

            console.log('Master data created successfully');
        } catch (error) {
            console.error('Error creating master data:', error);
            throw error;
        }
    }

    async createTransactionalData() {
        console.log('Creating transactional data...');
        try {
            // Track which students already have pendaftaran
            const studentsWithPendaftaran = new Set();
            const studentsInKelasProgram = new Set();

            // Create Kelas Program for each guru (2-3 classes per guru)
            for (const guru of this.users.gurus) {
                const numClasses = faker.number.int({ min: 2, max: 3 });
                for (let i = 0; i < numClasses; i++) {
                    const kelasProgram = await prismaClient.kelasProgram.create({
                        data: {
                            kelasId: faker.helpers.arrayElement(this.data.kelas).id,
                            programId: faker.helpers.arrayElement(this.data.programs).id,
                            hari: faker.helpers.arrayElement(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']),
                            jamMengajarId: faker.helpers.arrayElement(this.data.jamMengajar).id,
                            guruId: guru.guru.id,
                            tipeKelas: faker.helpers.weightedArrayElement([
                                { weight: 0.7, value: 'GROUP' },
                                { weight: 0.2, value: 'PRIVATE' },
                                { weight: 0.05, value: 'SUBSTITUTE' },
                                { weight: 0.05, value: 'ONLINE' }
                            ]),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    });
                    this.data.kelasProgram.push(kelasProgram);
                }
            }

            // Randomly select 65% of students to have kelas program assigned
            // 35% will be unverified (belum masuk kelas program)
            const shuffledSiswas = [...this.users.siswas].sort(() => Math.random() - 0.5);
            const siswaWithKelasCount = Math.floor(this.users.siswas.length * 0.65);
            const siswaWithKelas = shuffledSiswas.slice(0, siswaWithKelasCount);
            const siswaWithoutKelas = shuffledSiswas.slice(siswaWithKelasCount);

            console.log(`Assigning ${siswaWithKelas.length} students to kelas program (verified)`);
            console.log(`Leaving ${siswaWithoutKelas.length} students without kelas program (unverified)`);

            // Create programSiswa for students WITH kelas program
            for (const siswa of siswaWithKelas) {
                const kelasProgram = faker.helpers.arrayElement(this.data.kelasProgram);
                const biayaPendaftaran = faker.number.int({ min: 100000, max: 250000 });
                const voucher = Math.random() > 0.7 ? faker.helpers.arrayElement(this.data.vouchers) : null;

                let diskon = 0;
                if (voucher) {
                    if (voucher.tipe === 'PERSENTASE') {
                        diskon = Math.min(biayaPendaftaran * (Number(voucher.nominal) / 100), biayaPendaftaran * 0.5);
                    } else {
                        diskon = Math.min(Number(voucher.nominal), biayaPendaftaran * 0.5);
                    }
                }
                const totalBiaya = Math.max(biayaPendaftaran - diskon, 0);

                // Create pembayaran for pendaftaran
                const pembayaran = await prismaClient.pembayaran.create({
                    data: {
                        tipePembayaran: 'PENDAFTARAN',
                        metodePembayaran: faker.helpers.arrayElement(['VIRTUAL_ACCOUNT', 'TUNAI', 'BANK_TRANSFER', 'EWALLET']),
                        jumlahTagihan: totalBiaya,
                        statusPembayaran: 'PAID',
                        tanggalPembayaran: this.generateDate(2024, 2025),
                        createdAt: faker.date.past(),
                        updatedAt: faker.date.past()
                    }
                });
                this.data.pembayaran.push(pembayaran);

                // Create pendaftaran
                const pendaftaran = await prismaClient.pendaftaran.create({
                    data: {
                        siswaId: siswa.siswa.id,
                        biayaPendaftaran,
                        tanggalDaftar: this.generateDate(2024, 2025),
                        diskon,
                        totalBiaya,
                        voucher_id: voucher?.id || null,
                        pembayaranId: pembayaran.id,
                        createdAt: faker.date.past(),
                        updatedAt: faker.date.past()
                    }
                });
                this.data.pendaftaran.push(pendaftaran);

                // Each student has only ONE active program
                const programSiswa = await prismaClient.programSiswa.create({
                    data: {
                        siswaId: siswa.siswa.id,
                        programId: kelasProgram.programId,
                        kelasProgramId: kelasProgram.id,
                        status: 'AKTIF',
                        isVerified: true, // Students with kelas are verified
                        createdAt: faker.date.past(),
                        updatedAt: faker.date.past()
                    }
                });
                this.data.programSiswa.push(programSiswa);

                // Create matching Jadwal Program Siswa
                await prismaClient.jadwalProgramSiswa.create({
                    data: {
                        programSiswaId: programSiswa.id,
                        hari: kelasProgram.hari,
                        jamMengajarId: kelasProgram.jamMengajarId,
                        urutan: 1,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });

                // Create PeriodeSpp for current and next few months
                const currentDate = new Date();
                for (let i = 0; i < 3; i++) {
                    const sppDate = new Date(currentDate);
                    sppDate.setMonth(sppDate.getMonth() + i);

                    const bulan = sppDate.toLocaleString('id-ID', { month: 'long' });
                    const tahun = sppDate.getFullYear();
                    const jumlahTagihan = faker.number.int({ min: 150000, max: 300000 });
                    const sppVoucher = Math.random() > 0.8 ? faker.helpers.arrayElement(this.data.vouchers) : null;

                    let sppDiskon = 0;
                    if (sppVoucher) {
                        if (sppVoucher.tipe === 'PERSENTASE') {
                            sppDiskon = Math.min(jumlahTagihan * (Number(sppVoucher.nominal) / 100), jumlahTagihan * 0.5);
                        } else {
                            sppDiskon = Math.min(Number(sppVoucher.nominal), jumlahTagihan * 0.5);
                        }
                    }
                    const totalTagihan = Math.max(jumlahTagihan - sppDiskon, 0);

                    // 70% chance to have payment for SPP
                    let sppPembayaranId = null;
                    if (Math.random() > 0.3) {
                        const sppPembayaran = await prismaClient.pembayaran.create({
                            data: {
                                tipePembayaran: 'SPP',
                                metodePembayaran: faker.helpers.arrayElement(['VIRTUAL_ACCOUNT', 'TUNAI', 'BANK_TRANSFER', 'EWALLET']),
                                jumlahTagihan: totalTagihan,
                                statusPembayaran: faker.helpers.weightedArrayElement([
                                    { weight: 0.6, value: 'PAID' },
                                    { weight: 0.2, value: 'PENDING' },
                                    { weight: 0.1, value: 'UNPAID' },
                                    { weight: 0.1, value: 'EXPIRED' }
                                ]),
                                tanggalPembayaran: this.generateDate(2024, 2025),
                                createdAt: faker.date.past(),
                                updatedAt: faker.date.past()
                            }
                        });
                        this.data.pembayaran.push(sppPembayaran);
                        sppPembayaranId = sppPembayaran.id;
                    }

                    const periodeSpp = await prismaClient.periodeSpp.create({
                        data: {
                            programSiswaId: programSiswa.id,
                            bulan,
                            tahun,
                            tanggalTagihan: `${tahun}-${String(sppDate.getMonth() + 1).padStart(2, '0')}-25`,
                            jumlahTagihan,
                            diskon: sppDiskon,
                            totalTagihan,
                            pembayaranId: sppPembayaranId,
                            voucher_id: sppVoucher?.id || null,
                            createdAt: faker.date.past(),
                            updatedAt: faker.date.past()
                        }
                    });
                    this.data.periodeSpp.push(periodeSpp);
                }

                // 30% chance to have old inactive programs (history)
                if (Math.random() < 0.3) {
                    const oldProgram = faker.helpers.arrayElement(this.data.programs.filter(p => p.id !== kelasProgram.programId));
                    const oldProgramSiswa = await prismaClient.programSiswa.create({
                        data: {
                            siswaId: siswa.siswa.id,
                            programId: oldProgram.id,
                            kelasProgramId: null, // Old program might not have kelas assigned
                            status: 'TIDAK_AKTIF', // Inactive program
                            isVerified: true,
                            createdAt: faker.date.past({ years: 2 }),
                            updatedAt: faker.date.past({ years: 1 })
                        }
                    });
                    this.data.programSiswa.push(oldProgramSiswa);
                }
            }

            // Create programSiswa for students WITHOUT kelas program (active but unverified)
            for (const siswa of siswaWithoutKelas) {
                const program = faker.helpers.arrayElement(this.data.programs);
                const biayaPendaftaran = faker.number.int({ min: 100000, max: 250000 });
                const voucher = Math.random() > 0.8 ? faker.helpers.arrayElement(this.data.vouchers) : null;

                let diskon = 0;
                if (voucher) {
                    if (voucher.tipe === 'PERSENTASE') {
                        diskon = Math.min(biayaPendaftaran * (Number(voucher.nominal) / 100), biayaPendaftaran * 0.5);
                    } else {
                        diskon = Math.min(Number(voucher.nominal), biayaPendaftaran * 0.5);
                    }
                }
                const totalBiaya = Math.max(biayaPendaftaran - diskon, 0);

                // Create pembayaran for pendaftaran (50% chance of being paid)
                let pembayaranId = null;
                if (Math.random() > 0.5) {
                    const pembayaran = await prismaClient.pembayaran.create({
                        data: {
                            tipePembayaran: 'PENDAFTARAN',
                            metodePembayaran: faker.helpers.arrayElement(['VIRTUAL_ACCOUNT', 'TUNAI', 'BANK_TRANSFER', 'EWALLET']),
                            jumlahTagihan: totalBiaya,
                            statusPembayaran: faker.helpers.weightedArrayElement([
                                { weight: 0.7, value: 'PAID' },
                                { weight: 0.2, value: 'PENDING' },
                                { weight: 0.1, value: 'UNPAID' }
                            ]),
                            tanggalPembayaran: this.generateDate(2024, 2025),
                            createdAt: faker.date.recent(),
                            updatedAt: faker.date.recent()
                        }
                    });
                    this.data.pembayaran.push(pembayaran);
                    pembayaranId = pembayaran.id;
                }

                // Create pendaftaran for unverified students too
                const pendaftaran = await prismaClient.pendaftaran.create({
                    data: {
                        siswaId: siswa.siswa.id,
                        biayaPendaftaran,
                        tanggalDaftar: this.generateDate(2024, 2025),
                        diskon,
                        totalBiaya,
                        voucher_id: voucher?.id || null,
                        pembayaranId,
                        createdAt: faker.date.recent(),
                        updatedAt: faker.date.recent()
                    }
                });
                this.data.pendaftaran.push(pendaftaran);

                // Each student has only ONE active program (waiting for class assignment)
                const programSiswa = await prismaClient.programSiswa.create({
                    data: {
                        siswaId: siswa.siswa.id,
                        programId: program.id,
                        kelasProgramId: null, // No kelas assigned yet
                        status: 'AKTIF', // Active status
                        isVerified: false, // Not verified yet
                        createdAt: faker.date.recent(),
                        updatedAt: faker.date.recent()
                    }
                });
                this.data.programSiswa.push(programSiswa);

                // Create jadwal for unverified students (they still have preferred schedule)
                const jamMengajar = faker.helpers.arrayElement(this.data.jamMengajar);
                await prismaClient.jadwalProgramSiswa.create({
                    data: {
                        programSiswaId: programSiswa.id,
                        hari: faker.helpers.arrayElement(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']),
                        jamMengajarId: jamMengajar.id,
                        urutan: 1,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });

                console.log(`Created unverified program for student ${siswa.siswa.namaMurid} - Program: ${program.namaProgram}`);

                // 20% chance to have old inactive programs (history)
                if (Math.random() < 0.2) {
                    const oldProgram = faker.helpers.arrayElement(this.data.programs.filter(p => p.id !== program.id));
                    const oldProgramSiswa = await prismaClient.programSiswa.create({
                        data: {
                            siswaId: siswa.siswa.id,
                            programId: oldProgram.id,
                            kelasProgramId: null,
                            status: faker.helpers.arrayElement(['TIDAK_AKTIF', 'CUTI']), // Inactive or on leave
                            isVerified: false,
                            createdAt: faker.date.past({ years: 2 }),
                            updatedAt: faker.date.past({ years: 1 })
                        }
                    });
                    this.data.programSiswa.push(oldProgramSiswa);
                }
            }

            // Log statistics
            const activeCount = this.data.programSiswa.filter(ps => ps.status === 'AKTIF').length;
            const inactiveCount = this.data.programSiswa.filter(ps => ps.status === 'TIDAK_AKTIF').length;
            const cutiCount = this.data.programSiswa.filter(ps => ps.status === 'CUTI').length;
            const verifiedCount = this.data.programSiswa.filter(ps => ps.isVerified && ps.status === 'AKTIF').length;
            const unverifiedCount = this.data.programSiswa.filter(ps => !ps.isVerified && ps.status === 'AKTIF').length;

            console.log(`Total ProgramSiswa created: ${this.data.programSiswa.length}`);
            console.log(`Active programs: ${activeCount} (Verified: ${verifiedCount}, Unverified: ${unverifiedCount})`);
            console.log(`Inactive programs: ${inactiveCount}`);
            console.log(`Cuti programs: ${cutiCount}`);
            console.log(`Total Pendaftaran created: ${this.data.pendaftaran.length}`);
            console.log(`Total Pembayaran created: ${this.data.pembayaran.length}`);
            console.log(`Total PeriodeSpp created: ${this.data.periodeSpp.length}`);

            // Create Payroll data for each guru
            for (const guru of this.users.gurus) {
                // Create payroll records for multiple months
                for (let month = 1; month <= 12; month++) {
                    const payroll = await prismaClient.payroll.create({
                        data: {
                            guruId: guru.guru.id,
                            periode: `${month.toString().padStart(2, '0')}-2025`,
                            bulan: month.toString().padStart(2, '0'),
                            tahun: 2025,
                            gajiPokok: faker.number.int({ min: 1000000, max: 5000000 }),
                            insentif: faker.number.int({ min: 100000, max: 500000 }),
                            potongan: faker.number.int({ min: 0, max: 200000 }),
                            totalGaji: faker.number.int({ min: 1000000, max: 5000000 }),
                            status: faker.helpers.arrayElement(['DRAFT', 'DIPROSES', 'SELESAI', 'GAGAL']),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    });
                    this.data.payroll.push(payroll);
                }
            }

            // Create Absensi data (only for students WITH kelas program)
            for (const kelasProgram of this.data.kelasProgram) {
                // Create Absensi Guru
                for (let i = 0; i < faker.number.int({ min: 5, max: 15 }); i++) {
                    const isTelat = Math.random() > 0.8;
                    const menitTerlambat = isTelat ? faker.number.int({ min: 1, max: 30 }) : null;
                    const statusKehadiran = faker.helpers.arrayElement(['HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT']);
                    const sks = faker.number.int({ min: 1, max: 4 });
                    const suratIzin = statusKehadiran === 'IZIN' ? `surat_izin_${faker.string.alphanumeric(8)}.pdf` : null;

                    // Generate a random date in June-July 2025
                    const attendanceDate = moment(faker.date.between({
                        from: '2025-06-01',
                        to: '2025-07-31'
                    }));

                    // Find the corresponding payroll record for this month
                    const payrollForMonth = this.data.payroll.find(p =>
                        p.guruId === kelasProgram.guruId &&
                        p.bulan === attendanceDate.format('MM') &&
                        p.tahun === 2025
                    );

                    const absensiGuru = await prismaClient.absensiGuru.create({
                        data: {
                            kelasProgramId: kelasProgram.id,
                            guruId: kelasProgram.guruId,
                            payrollId: payrollForMonth.id, // Link to the corresponding payroll
                            tanggal: attendanceDate.format('DD-MM-YYYY'),
                            jamMasuk: this.generateTime(),
                            sks,
                            suratIzin,
                            statusKehadiran,
                            terlambat: isTelat,
                            menitTerlambat,
                            potonganTerlambat: isTelat ? ATTENDANCE_RULES.LATE_PENALTY : null,
                            potonganTanpaKabar: statusKehadiran === 'TIDAK_HADIR' ? ATTENDANCE_RULES.ABSENT_NO_NOTICE_PENALTY : null,
                            potonganTanpaSuratIzin: statusKehadiran === 'IZIN' && !suratIzin ? ATTENDANCE_RULES.ABSENT_NO_LETTER_PENALTY : null,
                            insentifKehadiran: statusKehadiran === 'HADIR' && sks >= 2 ? ATTENDANCE_RULES.INCENTIVE : null,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    });
                    this.data.absensiGuru.push(absensiGuru);
                }

                // Create Absensi Siswa for each ProgramSiswa in this KelasProgram
                const programSiswaList = this.data.programSiswa.filter(ps =>
                    ps.kelasProgramId === kelasProgram.id && ps.status === 'AKTIF'
                );

                for (const programSiswa of programSiswaList) {
                    for (let i = 0; i < faker.number.int({ min: 5, max: 15 }); i++) {
                        const absensiSiswa = await prismaClient.absensiSiswa.create({
                            data: {
                                kelasProgramId: kelasProgram.id,
                                siswaId: programSiswa.siswaId,
                                tanggal: moment(faker.date.between({
                                    from: '2025-06-01',
                                    to: '2025-07-31'
                                })).format('DD-MM-YYYY'),
                                statusKehadiran: faker.helpers.arrayElement(['HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT']),
                                createdAt: new Date(),
                                updatedAt: new Date()
                            }
                        });
                        this.data.absensiSiswa.push(absensiSiswa);
                    }
                }
            }

            // Create Riwayat Status Siswa for some students
            const studentsWithHistory = faker.helpers.arrayElements(this.users.siswas, Math.floor(this.users.siswas.length * 0.3));
            for (const siswa of studentsWithHistory) {
                const programSiswaForThisStudent = this.data.programSiswa.filter(ps => ps.siswaId === siswa.siswa.id);

                if (programSiswaForThisStudent.length > 0) {
                    const activeProgramSiswa = programSiswaForThisStudent.find(ps => ps.status === 'AKTIF');
                    if (activeProgramSiswa) {
                        // Create riwayat status siswa
                        if (activeProgramSiswa.isVerified) {
                            await prismaClient.riwayatStatusSiswa.create({
                                data: {
                                    programSiswaId: activeProgramSiswa.id,
                                    statusLama: 'TIDAK_AKTIF',
                                    statusBaru: 'AKTIF',
                                    tanggalPerubahan: this.generateDate(),
                                    createdAt: faker.date.recent(),
                                    updatedAt: faker.date.recent()
                                }
                            });
                        }
                    }
                }
            }

            console.log('Transactional data created successfully');
        } catch (error) {
            console.error('Error creating transactional data:', error);
            throw error;
        }
    }

    async createFinanceData() {
        console.log('Creating finance data...');
        try {
            // Create automatic finance records from SPP payments
            for (const pembayaran of this.data.pembayaran) {
                if (pembayaran.tipePembayaran === 'SPP' && pembayaran.statusPembayaran === 'PAID') {
                    // Find the related period and student
                    const periodeSpp = await prismaClient.periodeSpp.findFirst({
                        where: { pembayaranId: pembayaran.id },
                        include: {
                            programSiswa: {
                                include: {
                                    siswa: true
                                }
                            }
                        }
                    });

                    if (periodeSpp) {
                        const financeData = FinanceFactory.createSppIncome(
                            periodeSpp.programSiswa.siswa.namaMurid,
                            pembayaran.jumlahTagihan
                        );

                        // Use the same date as the payment
                        financeData.tanggal = pembayaran.tanggalPembayaran;

                        const finance = await prismaClient.finance.create({
                            data: {
                                ...financeData,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            }
                        });
                        this.data.finance.push(finance);
                    }
                }

                if (pembayaran.tipePembayaran === 'PENDAFTARAN' && pembayaran.statusPembayaran === 'PAID') {
                    // Find the related pendaftaran and student
                    const pendaftaran = await prismaClient.pendaftaran.findFirst({
                        where: { pembayaranId: pembayaran.id },
                        include: {
                            siswa: true
                        }
                    });

                    if (pendaftaran) {
                        const financeData = FinanceFactory.createEnrollmentIncome(
                            pendaftaran.siswa.namaMurid,
                            pembayaran.jumlahTagihan
                        );

                        // Use the same date as the payment
                        financeData.tanggal = pembayaran.tanggalPembayaran;

                        const finance = await prismaClient.finance.create({
                            data: {
                                ...financeData,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            }
                        });
                        this.data.finance.push(finance);
                    }
                }
            }

            // Create automatic finance records from payroll
            for (const payroll of this.data.payroll) {
                if (payroll.status === 'SELESAI') {
                    // Find the guru name
                    const guru = this.users.gurus.find(g => g.guru.id === payroll.guruId);
                    if (guru) {
                        const financeData = FinanceFactory.createPayrollExpense(
                            guru.guru.nama,
                            payroll.totalGaji
                        );

                        const finance = await prismaClient.finance.create({
                            data: {
                                ...financeData,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            }
                        });
                        this.data.finance.push(finance);
                    }
                }
            }

            // Create additional random finance records
            for (let i = 0; i < 200; i++) {
                const financeData = FinanceFactory.create();
                const finance = await prismaClient.finance.create({
                    data: {
                        ...financeData,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
                this.data.finance.push(finance);
            }

            console.log(`Finance data created: ${this.data.finance.length} records`);
        } catch (error) {
            console.error('Error creating finance data:', error);
            throw error;
        }
    }

    async createTestimoniAndGaleri() {
        console.log('Creating testimoni and galeri data...');
        try {
            // Create Testimoni data
            for (let i = 0; i < 20; i++) {
                const testimoni = await prismaClient.testimoni.create({
                    data: {
                        nama: faker.person.fullName(),
                        posisi: faker.helpers.arrayElement([
                            'Orang Tua Siswa',
                            'Alumni',
                            'Siswa Aktif',
                            'Guru',
                            'Pengurus Masjid',
                            'Tokoh Masyarakat'
                        ]),
                        isi: faker.lorem.paragraphs(2, '\n\n'),
                        fotoUrl: `testimoni_${i + 1}.jpg`,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
                this.data.testimoni.push(testimoni);
            }

            // Create Galeri data
            for (let i = 0; i < 30; i++) {
                const galeri = await prismaClient.galeri.create({
                    data: {
                        judulFoto: faker.helpers.arrayElement([
                            'Kegiatan Tahfidz',
                            'Pembelajaran Tahsin',
                            'Wisuda Huffadz',
                            'Kegiatan Ramadhan',
                            'Outing Class',
                            'Kompetisi Qiroah',
                            'Pelatihan Guru',
                            'Kegiatan Sosial',
                            'Pembelajaran Online',
                            'Fasilitas Surau'
                        ]) + ` ${i + 1}`,
                        coverGaleri: `galeri_${i + 1}.jpg`,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
                this.data.galeri.push(galeri);
            }

            console.log(`Testimoni created: ${this.data.testimoni.length} records`);
            console.log(`Galeri created: ${this.data.galeri.length} records`);
        } catch (error) {
            console.error('Error creating testimoni and galeri data:', error);
            throw error;
        }
    }

    async seed() {
        try {
            console.log('Starting database seeding...');
            await this.createUsers();
            await this.createMasterData();
            await this.createTransactionalData();
            await this.createFinanceData();
            await this.createTestimoniAndGaleri();
            console.log('Database seeding completed successfully!');
        } catch (error) {
            console.error('Error seeding database:', error);
            throw error;
        }
    }
}

module.exports = new FakerSeeder();