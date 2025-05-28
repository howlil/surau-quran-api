const { PrismaClient } = require('../../generated/prisma');
const UserFactory = require('../factories/user.factory');
const AdminFactory = require('../factories/admin.factory');
const GuruFactory = require('../factories/guru.factory');
const SiswaFactory = require('../factories/siswa.factory');
const KelasFactory = require('../factories/kelas.factory');
const ProgramFactory = require('../factories/program.factory');
const JamMengajarFactory = require('../factories/jam-mengajar.factory');
const KelasProgramFactory = require('../factories/kelas-program.factory');
const VoucherFactory = require('../factories/voucher.factory');
const ProgramSiswaFactory = require('../factories/program-siswa.factory');
const JadwalProgramSiswaFactory = require('../factories/jadwal-program-siswa.factory');
const PendaftaranFactory = require('../factories/pendaftaran.factory');
const PeriodeSppFactory = require('../factories/periode-spp.factory');
const PembayaranFactory = require('../factories/pembayaran.factory');
const XenditPaymentFactory = require('../factories/xendit-payment.factory');
const PayrollFactory = require('../factories/payroll.factory');
const AbsensiSiswaFactory = require('../factories/absensi-siswa.factory');
const AbsensiGuruFactory = require('../factories/absensi-guru.factory');
const RiwayatStatusSiswaFactory = require('../factories/riwayat-status-siswa.factory');

const prisma = new PrismaClient();

class MainSeeder {
    static async seed() {
        try {
            console.log('🌱 Starting database seeding...');

            // Create default users
            console.log('Creating default users...');
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
                        tarifPerJam: 100000,
                        nip: '000001'
                    }
                },
                {
                    email: 'example@siswa.com',
                    role: 'SISWA',
                    profile: {
                        nis: '000001',
                        namaMurid: 'Siswa Example',
                        namaPanggilan: 'Example',
                        tanggalLahir: '2000-01-01',
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

            const adminUsers = [];
            const guruUsers = [];
            const siswaUsers = [];

            for (const defaultUser of defaultUsers) {
                const existingUser = await prisma.user.findUnique({
                    where: { email: defaultUser.email }
                });

                if (!existingUser) {
                    const userData = await UserFactory.createRandomUser(defaultUser.role);
                    userData.email = defaultUser.email;

                    const user = await prisma.user.create({
                        data: userData
                    });

                    if (defaultUser.role === 'ADMIN') {
                        await prisma.admin.create({
                            data: {
                                ...defaultUser.profile,
                                userId: user.id
                            }
                        });
                        adminUsers.push(user.id);
                    } else if (defaultUser.role === 'GURU') {
                        await prisma.guru.create({
                            data: {
                                ...defaultUser.profile,
                                userId: user.id
                            }
                        });
                        guruUsers.push(user.id);
                    } else if (defaultUser.role === 'SISWA') {
                        await prisma.siswa.create({
                            data: {
                                ...defaultUser.profile,
                                userId: user.id
                            }
                        });
                        siswaUsers.push(user.id);
                    }
                } else {
                    if (defaultUser.role === 'ADMIN') adminUsers.push(existingUser.id);
                    if (defaultUser.role === 'GURU') guruUsers.push(existingUser.id);
                    if (defaultUser.role === 'SISWA') siswaUsers.push(existingUser.id);
                }
            }

       
            for (let i = 0; i < 20; i++) {
                const userData = await UserFactory.createRandomUser('ADMIN');
                const randomUser = await prisma.user.create({
                    data: userData
                });

                await prisma.admin.create({
                    data: {
                        nama: `Admin ${i + 1}`,
                        userId: randomUser.id
                    }
                });

                adminUsers.push(randomUser.id);
            }

            // Create 20 additional guru users
            for (let i = 0; i < 20; i++) {
                const userData = await UserFactory.createRandomUser('GURU');
                const randomUser = await prisma.user.create({
                    data: userData
                });

                await prisma.guru.create({
                    data: {
                        nip: `${(i + 2).toString().padStart(6, '0')}`,
                        nama: `Ustadz/ah ${i + 1}`,
                        noWhatsapp: `08${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`,
                        alamat: `Jl. Guru No. ${i + 1}`,
                        jenisKelamin: i % 2 === 0 ? 'LAKI_LAKI' : 'PEREMPUAN',
                        keahlian: ['Tahfidz', 'Tajwid', 'Qiraat'][i % 3],
                        pendidikanTerakhir: ['S1', 'S2', 'S3'][i % 3],
                        noRekening: Math.floor(Math.random() * 1000000000000).toString(),
                        namaBank: ['BCA', 'Mandiri', 'BNI', 'BSI'][i % 4],
                        tarifPerJam: 50000 + (i * 5000),
                        userId: randomUser.id
                    }
                });

                guruUsers.push(randomUser.id);
            }

            // Create 20 additional siswa users
            console.log('Creating additional siswa users...');
            for (let i = 0; i < 20; i++) {
                const userData = await UserFactory.createRandomUser('SISWA');
                const randomUser = await prisma.user.create({
                    data: userData
                });

                await prisma.siswa.create({
                    data: {
                        nis: `${(i + 2).toString().padStart(6, '0')}`,
                        namaMurid: `Siswa ${i + 1}`,
                        namaPanggilan: `S${i + 1}`,
                        tanggalLahir: `${2005 + (i % 10)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
                        jenisKelamin: i % 2 === 0 ? 'LAKI_LAKI' : 'PEREMPUAN',
                        alamat: `Jl. Siswa No. ${i + 1}`,
                        strataPendidikan: ['SD', 'SMP', 'SMA'][i % 3],
                        kelasSekolah: `${(i % 6) + 1}`,
                        namaSekolah: `Sekolah ${i + 1}`,
                        namaOrangTua: `Orang Tua Siswa ${i + 1}`,
                        namaPenjemput: `Penjemput Siswa ${i + 1}`,
                        noWhatsapp: `08${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`,
                        isRegistered: true,
                        userId: randomUser.id
                    }
                });

                siswaUsers.push(randomUser.id);
            }

            // Continue with other seeding operations
            console.log(`✅ User seeding completed! Created users:
            - ${adminUsers.length} admins (including default admin@example.com)
            - ${guruUsers.length} gurus (including default guru@example.com)
            - ${siswaUsers.length} siswas (including default siswa@example.com)`);

            // Create kelas, program, and jam mengajar
            console.log('Creating kelas, program, and jam mengajar...');

            // Create 10 Kelas
            const kelasIds = [];
            for (let i = 0; i < 10; i++) {
                const kelas = await prisma.kelas.create({
                    data: KelasFactory.create(i)
                });
                kelasIds.push(kelas.id);
            }

            // Create 10 Programs
            const programIds = [];
            for (let i = 0; i < 10; i++) {
                const program = await prisma.program.create({
                    data: ProgramFactory.create(i)
                });
                programIds.push(program.id);
            }

            // Create 10 Jam Mengajar
            const jamMengajarIds = [];
            for (let i = 0; i < 10; i++) {
                const jamMengajar = await prisma.jamMengajar.create({
                    data: JamMengajarFactory.create(i)
                });
                jamMengajarIds.push(jamMengajar.id);
            }

            // Create 10 Vouchers
            console.log('Creating vouchers...');
            const voucherIds = [];
            for (let i = 0; i < 10; i++) {
                const voucher = await prisma.voucher.create({
                    data: VoucherFactory.create(i)
                });
                voucherIds.push(voucher.id);
            }

            // Create 10 Kelas Program with relationships
            console.log('Creating kelas programs...');
            const kelasProgramIds = [];
            const allGurus = await prisma.guru.findMany();
            const guruIds = allGurus.map(guru => guru.id);

            for (let i = 0; i < 10; i++) {
                const kelasProgram = await prisma.kelasProgram.create({
                    data: KelasProgramFactory.create(
                        kelasIds[i % kelasIds.length],
                        programIds[i % programIds.length],
                        jamMengajarIds[i % jamMengajarIds.length],
                        guruIds[i % guruIds.length],
                        i
                    )
                });
                kelasProgramIds.push(kelasProgram.id);
            }

            // Create Siswa Records
            console.log('Creating student program relationships and pendaftaran...');
            const allSiswa = await prisma.siswa.findMany();
            const siswaIds = allSiswa.map(siswa => siswa.id);

            // Create Program Siswa records
            const programSiswaIds = [];
            for (let i = 0; i < 10; i++) {
                const programSiswa = await prisma.programSiswa.create({
                    data: ProgramSiswaFactory.create(
                        siswaIds[i % siswaIds.length],
                        programIds[i % programIds.length],
                        kelasProgramIds[i % kelasProgramIds.length]
                    )
                });
                programSiswaIds.push(programSiswa.id);
            }

            // Create Jadwal Program Siswa
            console.log('Creating jadwal program siswa...');
            for (let i = 0; i < 10; i++) {
                await prisma.jadwalProgramSiswa.create({
                    data: JadwalProgramSiswaFactory.create(
                        programSiswaIds[i % programSiswaIds.length],
                        jamMengajarIds[i % jamMengajarIds.length],
                        i
                    )
                });
            }

            // Create Riwayat Status Siswa
            console.log('Creating riwayat status siswa...');
            for (let i = 0; i < 10; i++) {
                const programSiswa = await prisma.programSiswa.findUnique({
                    where: { id: programSiswaIds[i % programSiswaIds.length] }
                });

                await prisma.riwayatStatusSiswa.create({
                    data: RiwayatStatusSiswaFactory.create(
                        programSiswaIds[i % programSiswaIds.length],
                        programSiswa.status,
                        i
                    )
                });
            }

            // Create Pendaftaran with Pembayaran and XenditPayment
            console.log('Creating pendaftaran and payment records...');

            // First, check which students already have pendaftaran records
            const existingPendaftaran = await prisma.pendaftaran.findMany({
                select: {
                    siswaId: true
                }
            });

            const existingSiswaIds = new Set(existingPendaftaran.map(p => p.siswaId));
            const availableSiswaIds = siswaIds.filter(id => !existingSiswaIds.has(id));

            // If we have available students, create pendaftaran records for them
            for (let i = 0; i < Math.min(10, availableSiswaIds.length); i++) {
                const siswaId = availableSiswaIds[i];

                // Skip if no more available students
                if (!siswaId) continue;

                // Use a voucher for some records
                const voucherId = i % 3 === 0 ? voucherIds[i % voucherIds.length] : null;

                // Create pendaftaran
                const pendaftaranData = PendaftaranFactory.create(
                    siswaId,
                    voucherId
                );

                // Create pembayaran for pendaftaran
                const pembayaran = await prisma.pembayaran.create({
                    data: PembayaranFactory.create(pendaftaranData.totalBiaya, 'PENDAFTARAN')
                });

                // Create xendit payment for pendaftaran
                await prisma.xenditPayment.create({
                    data: XenditPaymentFactory.create(pembayaran.id, pembayaran.statusPembayaran)
                });

                // Create pendaftaran with pembayaran
                await prisma.pendaftaran.create({
                    data: {
                        ...pendaftaranData,
                        pembayaranId: pembayaran.id
                    }
                });
            }

            // Create Periode SPP with Pembayaran and XenditPayment
            console.log('Creating periode SPP records...');
            for (let i = 0; i < 10; i++) {
                // Use a voucher for some records
                const voucherId = i % 4 === 0 ? voucherIds[i % voucherIds.length] : null;

                // Create periode SPP data
                const periodeSppData = PeriodeSppFactory.create(
                    programSiswaIds[i % programSiswaIds.length],
                    voucherId,
                    i
                );

                // Create pembayaran for periode SPP
                if (['PAID', 'SETTLED'].includes(periodeSppData.statusPembayaran)) {
                    const pembayaran = await prisma.pembayaran.create({
                        data: PembayaranFactory.create(periodeSppData.totalTagihan, 'SPP')
                    });

                    // Create xendit payment for periode SPP
                    await prisma.xenditPayment.create({
                        data: XenditPaymentFactory.create(pembayaran.id, pembayaran.statusPembayaran)
                    });

                    // Create periode SPP with pembayaran
                    await prisma.periodeSpp.create({
                        data: {
                            ...periodeSppData,
                            pembayaranId: pembayaran.id
                        }
                    });
                } else {
                    // Create periode SPP without pembayaran
                    await prisma.periodeSpp.create({
                        data: periodeSppData
                    });
                }
            }

            // Create Payroll for Guru
            console.log('Creating payroll records...');
            const payrollIds = [];
            for (let i = 0; i < 10; i++) {
                const payroll = await prisma.payroll.create({
                    data: PayrollFactory.create(guruIds[i % guruIds.length], i)
                });
                payrollIds.push(payroll.id);
            }

            // Create Absensi Guru
            console.log('Creating absensi guru records...');
            for (let i = 0; i < 10; i++) {
                await prisma.absensiGuru.create({
                    data: AbsensiGuruFactory.create(
                        kelasProgramIds[i % kelasProgramIds.length],
                        guruIds[i % guruIds.length],
                        i % 2 === 0 ? payrollIds[i % payrollIds.length] : null,
                        i
                    )
                });
            }

            // Create Absensi Siswa
            console.log('Creating absensi siswa records...');
            for (let i = 0; i < 10; i++) {
                await prisma.absensiSiswa.create({
                    data: AbsensiSiswaFactory.create(
                        kelasProgramIds[i % kelasProgramIds.length],
                        siswaIds[i % siswaIds.length],
                        i
                    )
                });
            }

            console.log('✅ Database seeding completed successfully!');
        } catch (error) {
            console.error('❌ Error seeding database:', error);
            throw error;
        } finally {
            await prisma.$disconnect();
        }
    }
}

module.exports = MainSeeder; 