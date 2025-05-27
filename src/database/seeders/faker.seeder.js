const { PrismaClient } = require('../../generated/prisma');
const { faker } = require('@faker-js/faker/locale/id_ID');
const moment = require('moment');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

const TOTAL_RECORDS = 30;
const DEFAULT_PASSWORD = '@Test123';
const SHIFT_TIMES = [
    { start: '10:00', end: '11:30' },
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
            vouchers: []
        };
    }

    generateDate(startYear = 2025) {
        const date = faker.date.between({
            from: `${startYear}-01-01`,
            to: `${startYear}-12-31`
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
                        noWhatsapp: '081234567890',
                        alamat: 'Jl. Contoh No. 1',
                        jenisKelamin: 'LAKI_LAKI',
                        keahlian: 'Tahfidz',
                        pendidikanTerakhir: 'S1',
                        noRekening: '1234567890',
                        namaBank: 'BSI',
                        tarifPerJam: 100000
                    }
                },
                {
                    email: 'example@siswa.com',
                    role: 'SISWA',
                    profile: {
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

            // Create default users
            for (const defaultUser of defaultUsers) {
                const userData = {
                    id: uuidv4(),
                    email: defaultUser.email,
                    password: await this.hashPassword(),
                    role: defaultUser.role
                };

                let user;
                if (defaultUser.role === 'ADMIN') {
                    user = await prisma.user.create({
                        data: {
                            ...userData,
                            admin: {
                                create: defaultUser.profile
                            }
                        },
                        include: { admin: true }
                    });
                    this.users.admins.push(user);
                } else if (defaultUser.role === 'GURU') {
                    user = await prisma.user.create({
                        data: {
                            ...userData,
                            guru: {
                                create: defaultUser.profile
                            }
                        },
                        include: { guru: true }
                    });
                    this.users.gurus.push(user);
                } else if (defaultUser.role === 'SISWA') {
                    user = await prisma.user.create({
                        data: {
                            ...userData,
                            siswa: {
                                create: defaultUser.profile
                            }
                        },
                        include: { siswa: true }
                    });
                    this.users.siswas.push(user);
                }
            }

            console.log('Created default users with email pattern example@[role].com and password @Test123');

            // Create additional random users
            const userPromises = [];
            for (let i = 0; i < TOTAL_RECORDS; i++) {
                const password = await this.hashPassword();

                // Create Admin
                userPromises.push(
                    prisma.user.create({
                        data: {
                            id: uuidv4(),
                            email: `admin.${i + 1}@surauquran.com`,
                            password,
                            role: 'ADMIN',
                            admin: {
                                create: {
                                    nama: faker.person.fullName()
                                }
                            }
                        },
                        include: { admin: true }
                    }),
                    // Create Guru
                    prisma.user.create({
                        data: {
                            id: uuidv4(),
                            email: `guru.${i + 1}@surauquran.com`,
                            password,
                            role: 'GURU',
                            guru: {
                                create: {
                                    nama: faker.person.fullName(),
                                    noWhatsapp: faker.phone.number('08##########'),
                                    alamat: faker.location.streetAddress(true),
                                    jenisKelamin: faker.helpers.arrayElement(['LAKI_LAKI', 'PEREMPUAN']),
                                    keahlian: faker.helpers.arrayElement(['Tahfidz', 'Tahsin', 'Bahasa Arab', 'Tilawah']),
                                    pendidikanTerakhir: faker.helpers.arrayElement(['S1', 'S2', 'S3']),
                                    noRekening: faker.finance.accountNumber(),
                                    namaBank: faker.helpers.arrayElement(['BCA', 'Mandiri', 'BNI', 'BSI']),
                                    tarifPerJam: faker.number.int({ min: 50000, max: 150000 })
                                }
                            }
                        },
                        include: { guru: true }
                    }),
                    // Create Siswa
                    prisma.user.create({
                        data: {
                            id: uuidv4(),
                            email: `siswa.${i + 1}@surauquran.com`,
                            password,
                            role: 'SISWA',
                            siswa: {
                                create: {
                                    namaMurid: faker.person.fullName(),
                                    namaPanggilan: faker.person.firstName(),
                                    tanggalLahir: this.generateDate(1990),
                                    jenisKelamin: faker.helpers.arrayElement(['LAKI_LAKI', 'PEREMPUAN']),
                                    alamat: faker.location.streetAddress(true),
                                    strataPendidikan: faker.helpers.arrayElement(['SD', 'SMP', 'SMA', 'KULIAH']),
                                    kelasSekolah: faker.helpers.arrayElement(['1', '2', '3', '4', '5', '6']),
                                    namaSekolah: `${faker.helpers.arrayElement(['SD', 'SMP', 'SMA'])} ${faker.company.name()}`,
                                    namaOrangTua: faker.person.fullName(),
                                    namaPenjemput: faker.person.fullName(),
                                    noWhatsapp: faker.phone.number('08##########'),
                                    isRegistered: true
                                }
                            }
                        },
                        include: { siswa: true }
                    })
                );
            }

            const users = await Promise.all(userPromises);
            users.forEach(user => {
                if (user.role === 'ADMIN') this.users.admins.push(user);
                if (user.role === 'GURU') this.users.gurus.push(user);
                if (user.role === 'SISWA') this.users.siswas.push(user);
            });

            console.log(`Created additional ${this.users.admins.length} admins, ${this.users.gurus.length} gurus, ${this.users.siswas.length} siswas`);
            console.log('Additional users follow the pattern [role].[number]@surauquran.com');
        } catch (error) {
            console.error('Error creating users:', error);
            throw error;
        }
    }

    async createMasterData() {
        console.log('Creating master data...');
        try {
            // Create Kelas in batch
            const kelasPromises = KELAS_NAMES.map(name =>
                prisma.kelas.create({
                    data: { namaKelas: name }
                })
            );
            this.data.kelas = await Promise.all(kelasPromises);

            // Create Programs in batch
            const programPromises = PROGRAM_NAMES.map(name =>
                prisma.program.create({
                    data: { namaProgram: name }
                })
            );
            this.data.programs = await Promise.all(programPromises);

            // Create Jam Mengajar in batch
            const jamMengajarPromises = SHIFT_TIMES.map(shift =>
                prisma.jamMengajar.create({
                    data: {
                        jamMulai: shift.start,
                        jamSelesai: shift.end
                    }
                })
            );
            this.data.jamMengajar = await Promise.all(jamMengajarPromises);

            // Create Vouchers in batch
            const voucherPromises = Array(TOTAL_RECORDS).fill().map(() =>
                prisma.voucher.create({
                    data: {
                        kodeVoucher: faker.string.alphanumeric(8).toUpperCase(),
                        tipe: faker.helpers.arrayElement(['PERSENTASE', 'NOMINAL']),
                        nominal: faker.number.int({ min: 50000, max: 500000 }),
                        isActive: true,
                        jumlahPenggunaan: faker.number.int({ min: 0, max: 100 })
                    }
                })
            );
            this.data.vouchers = await Promise.all(voucherPromises);

            // Create Kelas Program with optimized relationships
            const kelasProgramPromises = [];
            this.data.kelas.forEach(kelas => {
                // Take first 2 programs for each kelas
                this.data.programs.slice(0, 2).forEach(program => {
                    // Take first 2 time slots for each program
                    this.data.jamMengajar.slice(0, 2).forEach(jamMengajar => {
                        const guru = faker.helpers.arrayElement(this.users.gurus);
                        if (!guru || !guru.guru) return; // Skip if no guru available

                        kelasProgramPromises.push(
                            prisma.kelasProgram.create({
                                data: {
                                    kelasId: kelas.id,
                                    programId: program.id,
                                    jamMengajarId: jamMengajar.id,
                                    guruId: guru.guru.id,
                                    hari: faker.helpers.arrayElement(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']),
                                    tipeKelas: faker.helpers.arrayElement(['REGULAR', 'PRIVATE', 'INTENSIVE'])
                                }
                            })
                        );
                    });
                });
            });
            this.data.kelasProgram = await Promise.all(kelasProgramPromises);

            console.log(`Created ${this.data.kelas.length} kelas, ${this.data.programs.length} programs, ${this.data.jamMengajar.length} jam mengajar, ${this.data.vouchers.length} vouchers, ${this.data.kelasProgram.length} kelas program`);
        } catch (error) {
            console.error('Error creating master data:', error);
            throw error;
        }
    }

    async createTransactionalData() {
        console.log('Creating transactional data...');
        try {
            for (const siswa of this.users.siswas) {
                if (!siswa.siswa) continue; // Skip if siswa profile doesn't exist

                // Create Pendaftaran with Pembayaran
                const pendaftaranData = {
                    siswaId: siswa.siswa.id,
                    biayaPendaftaran: faker.number.int({ min: 100000, max: 500000 }),
                    tanggalDaftar: this.generateDate(),
                    diskon: faker.number.int({ min: 0, max: 100000 })
                };

                // Only add voucher if we have vouchers available
                if (this.data.vouchers.length > 0) {
                    const randomVoucher = faker.helpers.arrayElement(this.data.vouchers);
                    if (randomVoucher) {
                        pendaftaranData.voucher_id = randomVoucher.id;
                    }
                }

                pendaftaranData.totalBiaya = pendaftaranData.biayaPendaftaran - pendaftaranData.diskon;

                // Create Pembayaran for Pendaftaran
                const pembayaranPendaftaran = await prisma.pembayaran.create({
                    data: {
                        tipePembayaran: 'PENDAFTARAN',
                        metodePembayaran: faker.helpers.arrayElement(['VIRTUAL_ACCOUNT', 'TUNAI', 'BANK_TRANSFER']),
                        jumlahTagihan: pendaftaranData.totalBiaya,
                        statusPembayaran: 'PAID',
                        tanggalPembayaran: this.generateDate()
                    }
                });

                await prisma.pendaftaran.create({
                    data: {
                        ...pendaftaranData,
                        pembayaranId: pembayaranPendaftaran.id
                    }
                });

                // Create Program Siswa and related data (2 programs per siswa)
                for (let i = 0; i < 2; i++) {
                    const kelasProgram = faker.helpers.arrayElement(this.data.kelasProgram);
                    if (!kelasProgram) continue; // Skip if no kelas program available

                    const programSiswa = await prisma.programSiswa.create({
                        data: {
                            siswaId: siswa.siswa.id,
                            programId: kelasProgram.programId,
                            kelasProgramId: kelasProgram.id,
                            status: 'AKTIF',
                            isVerified: true
                        }
                    });

                    // Create Jadwal
                    await prisma.jadwalProgramSiswa.create({
                        data: {
                            programSiswaId: programSiswa.id,
                            jamMengajarId: kelasProgram.jamMengajarId,
                            hari: kelasProgram.hari
                        }
                    });

                    // Create 3 months of SPP
                    for (let month = 1; month <= 3; month++) {
                        const sppAmount = faker.number.int({ min: 200000, max: 500000 });
                        const sppDiskon = faker.number.int({ min: 0, max: 50000 });

                        const pembayaranSpp = await prisma.pembayaran.create({
                            data: {
                                tipePembayaran: 'SPP',
                                metodePembayaran: faker.helpers.arrayElement(['VIRTUAL_ACCOUNT', 'TUNAI', 'BANK_TRANSFER']),
                                jumlahTagihan: sppAmount - sppDiskon,
                                statusPembayaran: faker.helpers.arrayElement(['PAID', 'UNPAID']),
                                tanggalPembayaran: this.generateDate()
                            }
                        });

                        const periodeSppData = {
                            programSiswaId: programSiswa.id,
                            bulan: moment().add(month, 'months').format('MM'),
                            tahun: 2024,
                            tanggalTagihan: this.generateDate(),
                            jumlahTagihan: sppAmount,
                            diskon: sppDiskon,
                            totalTagihan: sppAmount - sppDiskon,
                            pembayaranId: pembayaranSpp.id
                        };

                        // Only add voucher if we have vouchers available
                        if (this.data.vouchers.length > 0) {
                            const randomVoucher = faker.helpers.arrayElement(this.data.vouchers);
                            if (randomVoucher) {
                                periodeSppData.voucher_id = randomVoucher.id;
                            }
                        }

                        await prisma.periodeSpp.create({ data: periodeSppData });
                    }

                    // Create Absensi Siswa (5 records per program)
                    const absensiSiswaPromises = Array(5).fill().map(() =>
                        prisma.absensiSiswa.create({
                            data: {
                                kelasProgramId: kelasProgram.id,
                                siswaId: siswa.siswa.id,
                                tanggal: this.generateDate(),
                                statusKehadiran: faker.helpers.arrayElement(['HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT'])
                            }
                        })
                    );
                    await Promise.all(absensiSiswaPromises);
                }
            }

            // Create Payroll and Absensi Guru
            for (const guru of this.users.gurus) {
                if (!guru.guru) continue; // Skip if guru profile doesn't exist

                // Create 3 months of payroll
                for (let month = 1; month <= 3; month++) {
                    const gajiPokok = faker.number.int({ min: 2000000, max: 5000000 });
                    const insentif = faker.number.int({ min: 100000, max: 500000 });
                    const potongan = faker.number.int({ min: 0, max: 200000 });

                    const payroll = await prisma.payroll.create({
                        data: {
                            guruId: guru.guru.id,
                            periode: `${moment().add(month, 'months').format('MM')}-2024`,
                            bulan: moment().add(month, 'months').format('MM'),
                            tahun: 2024,
                            gajiPokok: gajiPokok,
                            insentif: insentif,
                            potongan: potongan,
                            totalGaji: gajiPokok + insentif - potongan,
                            status: faker.helpers.arrayElement(['DRAFT', 'DIPROSES', 'SELESAI'])
                        }
                    });

                    // Create Absensi Guru (20 records per month)
                    const kelasPrograms = this.data.kelasProgram.filter(kp => kp.guruId === guru.guru.id);
                    if (kelasPrograms.length > 0) {
                        const absensiGuruPromises = Array(20).fill().map(() => {
                            const kelasProgram = faker.helpers.arrayElement(kelasPrograms);
                            const shift = faker.helpers.arrayElement(SHIFT_TIMES);
                            return prisma.absensiGuru.create({
                                data: {
                                    kelasProgramId: kelasProgram.id,
                                    payrollId: payroll.id,
                                    guruId: guru.guru.id,
                                    tanggal: this.generateDate(),
                                    jamMasuk: shift.start,
                                    jamKeluar: shift.end,
                                    sks: 2,
                                    statusKehadiran: faker.helpers.arrayElement(['HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT'])
                                }
                            });
                        });
                        await Promise.all(absensiGuruPromises);
                    }
                }
            }
        } catch (error) {
            console.error('Error creating transactional data:', error);
            throw error;
        }
    }

    async seed() {
        try {
            console.log('🌱 Starting database seeding with Faker...');

            await this.createUsers();
            await this.createMasterData();
            await this.createTransactionalData();

            console.log('✅ Database seeding completed successfully!');
        } catch (error) {
            console.error('❌ Error seeding database:', error);
            throw error;
        } finally {
            await prisma.$disconnect();
        }
    }
}

module.exports = new FakerSeeder(); 