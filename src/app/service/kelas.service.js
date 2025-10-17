const { prisma } = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const PrismaUtils = require('../../lib/utils/prisma.utils');

class KelasService {


    async create(options) {
        try {
            const { data } = options;
            
            const existing = await prisma.kelas.findFirst({
                where: { namaKelas: data.namaKelas }
            });

            if (existing) {
                throw ErrorFactory.badRequest(`Kelas dengan nama ${data.namaKelas} sudah ada`);
            }

            const kelas = await prisma.kelas.create({
                data
            });

            return kelas;
        } catch (error) {
            throw error;
        }
    }

    async update(options) {
        try {
            const { data, where } = options;
            const { id } = where;
            
            const kelas = await prisma.kelas.findUnique({
                where: { id }
            });

            if (!kelas) {
                throw ErrorFactory.notFound(`Kelas dengan ID ${id} tidak ditemukan`);
            }

            if (data.namaKelas && data.namaKelas !== kelas.namaKelas) {
                const existing = await prisma.kelas.findFirst({
                    where: {
                        namaKelas: data.namaKelas,
                        id: { not: id }
                    }
                });

                if (existing) {
                    throw ErrorFactory.badRequest(`Kelas dengan nama ${data.namaKelas} sudah ada`);
                }
            }

            const updated = await prisma.kelas.update({
                where: { id },
                data
            });

            return updated;
        } catch (error) {
            throw error;
        }
    }

    async delete(options) {
        try {
            const { where } = options;
            const { id } = where;
            
            const kelas = await prisma.kelas.findUnique({
                where: { id }
            });

            if (!kelas) {
                throw ErrorFactory.notFound(`Kelas dengan ID ${id} tidak ditemukan`);
            }

            const kelasProgram = await prisma.kelasProgram.findFirst({
                where: { kelasId: id }
            });

            if (kelasProgram) {
                throw ErrorFactory.badRequest('Kelas sedang digunakan dalam program kelas dan tidak dapat dihapus');
            }

            await prisma.kelas.delete({
                where: { id }
            });

            return { id };
        } catch (error) {
            throw error;
        }
    }

    async getAll() {
        try {
            const kelasList = await prisma.kelas.findMany({
                select: {
                    id: true,
                    namaKelas: true,
                    warnaCard: true,
                    createdAt: true,
                    updatedAt: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return kelasList;
        } catch (error) {
            throw error;
        }
    }


    async getCCTVByUserId(siswaUserId) {
        try {
            // 1. Cari siswa berdasarkan user ID
            const siswa = await prisma.siswa.findUnique({
                where: { userId: siswaUserId }
            });

            if (!siswa) {
                throw ErrorFactory.notFound('Profil siswa tidak ditemukan');
            }

            // 2. Cari program siswa yang masih aktif dan ter-enroll di kelas program
            const programSiswa = await prisma.programSiswa.findMany({
                where: {
                    siswaId: siswa.id,
                    status: 'AKTIF',
                    kelasProgramId: { not: null } // Hanya yang sudah ter-enroll di kelas
                },
                include: {
                    program: {
                        select: {
                            id: true,
                            namaProgram: true
                        }
                    }
                }
            });

            if (programSiswa.length === 0) {
                throw ErrorFactory.notFound('Siswa tidak terdaftar dalam kelas program apapun');
            }

            const kelasProgramIds = programSiswa.map(ps => ps.kelasProgramId);

            // 3. Cari semua kelas program yang berkaitan dengan siswa dan memiliki CCTV
            const kelasPrograms = await prisma.kelasProgram.findMany({
                where: {
                    id: { in: kelasProgramIds },
                    kelas: {
                        ipAddressHikvision: { not: null } // Hanya kelas yang memiliki CCTV
                    }
                },
                include: {
                    kelas: {
                        select: {
                            id: true,
                            namaKelas: true,
                            ipAddressHikvision: true
                        }
                    },
                    program: {
                        select: {
                            id: true,
                            namaProgram: true
                        }
                    },
                    jamMengajar: {
                        select: {
                            jamMulai: true,
                            jamSelesai: true
                        }
                    }
                },
                orderBy: [
                    { kelas: { namaKelas: 'asc' } },
                    { program: { namaProgram: 'asc' } }
                ]
            });

            if (kelasPrograms.length === 0) {
                throw ErrorFactory.notFound('Tidak ada kelas dengan CCTV yang dapat diakses siswa ini');
            }

            // 4. Format response dengan informasi lengkap
            const cctvList = kelasPrograms.map(kp => ({
                kelasId: kp.kelas.id,
                namaKelas: kp.kelas.namaKelas,
                programId: kp.program.id,
                namaProgram: kp.program.namaProgram,
                hari: kp.hari,
                jamMengajar: {
                    jamMulai: kp.jamMengajar.jamMulai,
                    jamSelesai: kp.jamMengajar.jamSelesai
                },
                cctvIP: kp.kelas.ipAddressHikvision
            }));


            return {
                siswaId: siswa.id,
                namaSiswa: siswa.namaMurid,
                totalCCTV: cctvList.length,
                cctvList
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new KelasService();