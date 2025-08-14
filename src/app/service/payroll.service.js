const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const { NotFoundError, BadRequestError } = require('../../lib/http/errors.http');
const financeService = require('./finance.service');
const moment = require('moment');
const axios = require('axios');
const FormatUtils = require('../../lib/utils/format.utils');
const { DATE_FORMATS } = require('../../lib/constants');

class PayrollService {

  parseMonthYearFilter(monthYear) {
    if (!monthYear) {
      const now = new Date();
      return {
        bulan: String(now.getMonth() + 1).padStart(2, '0'),
        tahun: now.getFullYear()
      };
    }

    const [bulan, tahun] = monthYear.split('-').map(num => parseInt(num));

    if (isNaN(bulan) || isNaN(tahun) || bulan < 1 || bulan > 12) {
      throw new BadRequestError('Format filter bulan-tahun tidak valid. Gunakan format MM-YYYY');
    }

    return {
      bulan: String(bulan).padStart(2, '0'),
      tahun: tahun
    };
  }
  // async getAllPayrollsForAdmin(filters = {}) {
  //   try {
  //     const { page = 1, limit = 10, monthYear } = filters;
  //     const { bulan, tahun } = this.parseMonthYearFilter(monthYear);

  //     logger.info(`Payroll filter - monthYear: ${monthYear}, parsed bulan: ${bulan}, tahun: ${tahun}`);

  //     // Get all active gurus first
  //     const gurus = await prisma.guru.findMany({
  //       select: {
  //         id: true,
  //         nama: true,
  //         nip: true,
  //         noRekening: true,
  //         namaBank: true
  //       },
  //       orderBy: { nama: 'asc' }
  //     });

  //     logger.info(`Found ${gurus.length} active gurus`);

  //     // Get payroll data for all gurus in the specified month
  //     const payrollData = await prisma.payroll.findMany({
  //       where: {
  //         bulan,
  //         tahun,
  //         guruId: {
  //           in: gurus.map(guru => guru.id)
  //         }
  //       },
  //       include: {
  //         absensiGuru: {
  //           where: {
  //             tanggal: {
  //               contains: `-${bulan}-${tahun}`
  //             }
  //           },
  //           select: {
  //             id: true,
  //             tanggal: true,
  //             statusKehadiran: true,
  //             sks: true,
  //             potonganTerlambat: true,
  //             potonganTanpaKabar: true,
  //             potonganTanpaSuratIzin: true,
  //             insentifKehadiran: true,
  //             kelasProgram: {
  //               select: {
  //                 tipeKelas: true
  //               }
  //             }
  //           }
  //         },
  //         payrollDisbursement: {
  //           include: {
  //             xenditDisbursement: {
  //               select: {
  //                 xenditStatus: true,
  //               }
  //             }
  //           }
  //         }
  //       }
  //     });

  //     logger.info(`Found ${payrollData.length} payroll records for ${bulan}-${tahun}`);

  //     // Create a map of guru payroll data for quick lookup
  //     const payrollMap = new Map();
  //     payrollData.forEach(payroll => {
  //       payrollMap.set(payroll.guruId, payroll);
  //     });

  //     // Check if current date is before the 25th of the month
  //     const currentDate = moment();
  //     const targetMonth = moment(`${tahun}-${bulan}-01`);
  //     const isBefore25th = currentDate.isBefore(targetMonth.clone().date(25));
  //     const isCurrentMonth = currentDate.format('MM-YYYY') === `${bulan}-${tahun}`;

  //     // Build response data for all gurus
  //     const allGuruData = gurus.map(guru => {
  //       const payroll = payrollMap.get(guru.id);
        
  //       if (!payroll) {
  //         // No payroll data exists for this guru
  //         if (isCurrentMonth && isBefore25th) {
  //           // Before 25th of current month - payroll not calculated yet
  //           return {
  //             id: null,
  //             namaGuru: guru.nama,
  //             idGuru: guru.nip || guru.id,
  //             bulan: this.getNamaBulan(parseInt(bulan)),
  //             bulanAngka: parseInt(bulan),
  //             tahun: parseInt(tahun),
  //             status: 'BELUM_DIHITUNG',
  //             paymentStatus: null,
  //             tanggalKalkulasi: null,
  //             catatan: null,
  //             gajiBersih: 0,
  //             detail: {
  //               mengajar: { jumlah: 0, sksRate: 35000, total: 0 },
  //               insentif: { jumlah: 0, rate: 10000, total: 0 },
  //               potongan: {
  //                 telat: { jumlah: 0, rate: 10000, total: 0 },
  //                 izin: { jumlah: 0, rate: 10000, total: 0 },
  //                 dll: { jumlah: 0, rate: 10000, total: 0 },
  //                 totalPotongan: 0
  //               }
  //             },
  //             message: 'Payroll akan dihitung otomatis pada tanggal 25'
  //           };
  //         } else {
  //           // Past month or after 25th - no payroll data
  //           return {
  //             id: null,
  //             namaGuru: guru.nama,
  //             idGuru: guru.nip || guru.id,
  //             bulan: this.getNamaBulan(parseInt(bulan)),
  //             bulanAngka: parseInt(bulan),
  //             tahun: parseInt(tahun),
  //             status: 'TIDAK_ADA_DATA',
  //             paymentStatus: null,
  //             tanggalKalkulasi: null,
  //             catatan: null,
  //             gajiBersih: 0,
  //             detail: {
  //               mengajar: { jumlah: 0, sksRate: 35000, total: 0 },
  //               insentif: { jumlah: 0, rate: 10000, total: 0 },
  //               potongan: {
  //                 telat: { jumlah: 0, rate: 10000, total: 0 },
  //                 izin: { jumlah: 0, rate: 10000, total: 0 },
  //                 dll: { jumlah: 0, rate: 10000, total: 0 },
  //                 totalPotongan: 0
  //               }
  //             },
  //             message: 'Tidak ada data payroll untuk periode ini'
  //           };
  //         }
  //       }

  //       // Payroll data exists - calculate as before
  //       const absensiStats = this.calculateDetailedAbsensiStats(payroll.absensiGuru);
  //       const totalMengajar = absensiStats.totalSKS * 35000;
  //       const totalInsentif = absensiStats.totalInsentif;
  //       const totalPotongan = absensiStats.potonganTelat + absensiStats.potonganIzin + absensiStats.potonganLainnya;

  //       return {
  //         id: payroll.id,
  //         namaGuru: guru.nama,
  //         idGuru: guru.nip || guru.id,
  //         bulan: this.getNamaBulan(parseInt(payroll.bulan)),
  //         bulanAngka: parseInt(payroll.bulan),
  //         tahun: payroll.tahun,
  //         status: payroll.status,
  //         paymentStatus: payroll.payrollDisbursement?.xenditDisbursement?.xenditStatus,
  //         tanggalKalkulasi: payroll.tanggalKalkulasi ? moment(payroll.tanggalKalkulasi).format(DATE_FORMATS.DEFAULT) : null,
  //         catatan: payroll.catatan,
  //         gajiBersih: totalMengajar + totalInsentif - totalPotongan,
  //         detail: {
  //           mengajar: {
  //             jumlah: absensiStats.totalSKS,
  //             sksRate: 35000,
  //             total: totalMengajar
  //           },
  //           insentif: {
  //             jumlah: absensiStats.totalKehadiran,
  //             rate: 10000,
  //             total: totalInsentif
  //           },
  //           potongan: {
  //             telat: {
  //               jumlah: absensiStats.jumlahTelat,
  //               rate: 10000,
  //               total: absensiStats.potonganTelat
  //             },
  //             izin: {
  //               jumlah: absensiStats.jumlahIzin,
  //               rate: 10000,
  //               total: absensiStats.potonganIzin
  //             },
  //             dll: {
  //               jumlah: absensiStats.jumlahTidakHadir,
  //               rate: 10000,
  //               total: absensiStats.potonganLainnya
  //             },
  //             totalPotongan: totalPotongan
  //           }
  //         }
  //       };
  //     });

  //     // Apply pagination
  //     const startIndex = (page - 1) * limit;
  //     const endIndex = startIndex + limit;
  //     const paginatedData = allGuruData.slice(startIndex, endIndex);

  //     const totalItems = allGuruData.length;
  //     const totalPages = Math.ceil(totalItems / limit);

  //     return {
  //       data: paginatedData,
  //       pagination: {
  //         page: parseInt(page),
  //         limit: parseInt(limit),
  //         totalItems,
  //         totalPages,
  //         hasNextPage: page < totalPages,
  //         hasPrevPage: page > 1
  //       },
  //       summary: {
  //         totalGurus: gurus.length,
  //         totalPayrollData: payrollData.length,
  //         bulan: this.getNamaBulan(parseInt(bulan)),
  //         tahun: parseInt(tahun),
  //         isBefore25th: isCurrentMonth && isBefore25th
  //       }
  //     };
  //   } catch (error) {
  //     logger.error('Error getting all payrolls for admin:', error);
  //     throw error;
  //   }
  // }
  async getAllPayrollsForAdmin(filters = {}) {
    try {
      const { page = 1, limit = 10, monthYear } = filters;
      const { bulan, tahun } = this.parseMonthYearFilter(monthYear);

      logger.info(`Payroll filter - monthYear: ${monthYear}, parsed bulan: ${bulan}, tahun: ${tahun}`);

      // Get all active gurus first
      const gurus = await prisma.guru.findMany({
        select: {
          id: true,
          nama: true,
          nip: true,
          noRekening: true,
          namaBank: true
        },
        orderBy: { nama: 'asc' }
      });

      logger.info(`Found ${gurus.length} active gurus`);

      // Get payroll data for all gurus in the specified month
      // Hanya gunakan format bulan MM (misal: "08")
      
      const payrollData = await prisma.payroll.findMany({
        where: {
          bulan: bulan,  // Format MM: "08"
          tahun: tahun,
          guruId: {
            in: gurus.map(guru => guru.id)
          }
        },
        include: {
          absensiGuru: {
            where: {
              OR: [
                {
              tanggal: {
                contains: `-${bulan}-${tahun}`
              }
                },
                {
                  payrollId: null,
                  tanggal: {
                    contains: `-${bulan}-${tahun}`
                  }
                }
              ]
            },
            select: {
              id: true,
              tanggal: true,
              statusKehadiran: true,
              sks: true,
              potonganTerlambat: true,
              potonganTanpaKabar: true,
              potonganTanpaSuratIzin: true,
              insentifKehadiran: true,
              kelasProgram: {
                select: {
                  tipeKelas: true
                }
              }
            }
          },
          payrollDisbursement: {
            include: {
              xenditDisbursement: {
                select: {
                  xenditStatus: true,
                }
              }
            }
          }
        }
      });

      logger.info(`Found ${payrollData.length} payroll records for ${bulan}-${tahun}`);

      // Create a map of guru payroll data for quick lookup
      const payrollMap = new Map();
      payrollData.forEach(payroll => {
        payrollMap.set(payroll.guruId, payroll);
      });
      


      // Check if current date is before the 25th of the month
      const currentDate = moment();
      const targetMonth = moment(`${tahun}-${bulan}-01`);
      const isBefore25th = currentDate.isBefore(targetMonth.clone().date(25));
      const isCurrentMonth = currentDate.format('MM-YYYY') === `${bulan}-${tahun}`;

      // Build response data for all gurus
      const allGuruData = await Promise.all(gurus.map(async (guru) => {
        const payroll = payrollMap.get(guru.id);
        
        if (!payroll) {
          // No payroll data exists for this guru
          if (isCurrentMonth && isBefore25th) {
            // Before 25th of current month - payroll not calculated yet
            return {
              id: null,
              namaGuru: guru.nama,
              nipGuru: guru.nip ,
              bulan: this.getNamaBulan(parseInt(bulan)),
              bulanAngka: parseInt(bulan),
              tahun: parseInt(tahun),
              status: 'BELUM_DIHITUNG',
              paymentStatus: null,
              tanggalKalkulasi: null,
              catatan: null,
              gajiBersih: 0,
              detail: {
                mengajar: { jumlah: 0, sksRate: 35000, total: 0 },
                insentif: { jumlah: 0, rate: 10000, total: 0 },
                potongan: {
                  telat: { jumlah: 0, rate: 10000, total: 0 },
                  izin: { jumlah: 0, rate: 10000, total: 0 },
                  dll: { jumlah: 0, rate: 10000, total: 0 },
                  totalPotongan: 0
                }
              },
              message: 'Payroll akan dihitung otomatis pada tanggal 25'
            };
          } else {
            // Past month or after 25th - no payroll data
            return {
              id: null,
              namaGuru: guru.nama,
              nipGuru: guru.nip ,
              bulan: this.getNamaBulan(parseInt(bulan)),
              bulanAngka: parseInt(bulan),
              tahun: parseInt(tahun),
              status: 'TIDAK_ADA_DATA',
              paymentStatus: null,
              tanggalKalkulasi: null,
              catatan: null,
              gajiBersih: 0,
              detail: {
                mengajar: { jumlah: 0, sksRate: 35000, total: 0 },
                insentif: { jumlah: 0, rate: 10000, total: 0 },
                potongan: {
                  telat: { jumlah: 0, rate: 10000, total: 0 },
                  izin: { jumlah: 0, rate: 10000, total: 0 },
                  dll: { jumlah: 0, rate: 10000, total: 0 },
                  totalPotongan: 0
                }
              },
              message: 'Tidak ada data payroll untuk periode ini'
            };
          }
        }

        // Payroll data exists - use existing data or calculate from absensi
        let totalMengajar, totalInsentif, totalPotongan, detailData;
        
        // Cek apakah ada data gajiPokok, insentif, potongan yang sudah dihitung
        if (payroll.gajiPokok && payroll.insentif !== null && payroll.potongan !== null) {
          // Gunakan data yang sudah ada di database
          totalMengajar = Number(payroll.gajiPokok);
          totalInsentif = Number(payroll.insentif || 0);
          totalPotongan = Number(payroll.potongan);
          
          const realAbsensiData = await prisma.absensiGuru.findMany({
            where: {
              guruId: guru.id,
              tanggal: {
                gte: `${tahun}-${bulan.padStart(2, '0')}-01`,
                lte: `${tahun}-${bulan.padStart(2, '0')}-31`
              }
            },
            select: {
              id: true,
              tanggal: true,
              statusKehadiran: true,
              sks: true,
              potonganTerlambat: true,
              potonganTanpaKabar: true,
              potonganTanpaSuratIzin: true,
              insentifKehadiran: true,
              kelasProgram: {
                select: {
                  tipeKelas: true
                }
              }
            }
          });
          

          
          // Hitung detail dari absensi real
          const absensiStats = this.calculateDetailedAbsensiStats(realAbsensiData);
          
          detailData = {
            mengajar: {
              jumlah: absensiStats.totalSKS,
              sksRate: 35000,
              total: totalMengajar
            },
            insentif: {
              jumlah: absensiStats.totalKehadiran,
              rate: 10000,
              total: totalInsentif
            },
            potongan: {
              telat: {
                jumlah: absensiStats.jumlahTelat,
                rate: 10000,
                total: absensiStats.potonganTelat
              },
              izin: {
                jumlah: absensiStats.jumlahIzin,
                rate: 10000,
                total: absensiStats.potonganIzin
              },
              dll: {
                jumlah: absensiStats.jumlahTidakHadir,
                rate: 10000,
                total: absensiStats.potonganLainnya
              },
              totalPotongan: totalPotongan
            }
          };
        } else {
          // Hitung ulang dari absensi jika data belum ada
        const absensiStats = this.calculateDetailedAbsensiStats(payroll.absensiGuru);
          totalMengajar = absensiStats.totalSKS * 35000;
          totalInsentif = absensiStats.totalInsentif;
          totalPotongan = absensiStats.potonganTelat + absensiStats.potonganIzin + absensiStats.potonganLainnya;
          
          detailData = {
            mengajar: {
              jumlah: absensiStats.totalSKS,
              sksRate: 35000,
              total: totalMengajar
            },
            insentif: {
              jumlah: absensiStats.totalKehadiran,
              rate: 10000,
              total: totalInsentif
            },
            potongan: {
              telat: {
                jumlah: absensiStats.jumlahTelat,
                rate: 10000,
                total: absensiStats.potonganTelat
              },
              izin: {
                jumlah: absensiStats.jumlahIzin,
                rate: 10000,
                total: absensiStats.potonganIzin
              },
              dll: {
                jumlah: absensiStats.jumlahTidakHadir,
                rate: 10000,
                total: absensiStats.potonganLainnya
              },
              totalPotongan: totalPotongan
            }
          };
        }

        // Bulan sudah dalam format MM, langsung parse ke integer
        const bulanAngka = parseInt(payroll.bulan);

        return {
          id: payroll.id,
          namaGuru: guru.nama,
          nipGuru: guru.nip ,
          bulan: this.getNamaBulan(bulanAngka),
          bulanAngka: bulanAngka,
          tahun: payroll.tahun,
          status: payroll.status,
          paymentStatus: payroll.payrollDisbursement?.xenditDisbursement?.xenditStatus,
          tanggalKalkulasi: payroll.tanggalKalkulasi ? moment(payroll.tanggalKalkulasi).format(DATE_FORMATS.DEFAULT) : null,
          catatan: payroll.catatan,
          gajiBersih: totalMengajar + totalInsentif - totalPotongan,
          detail: detailData
        };
      }));

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = allGuruData.slice(startIndex, endIndex);

      const totalItems = allGuruData.length;
      const totalPages = Math.ceil(totalItems / limit);

      return {
        data: paginatedData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        summary: {
          totalGurus: gurus.length,
          totalPayrollData: payrollData.length,
          bulan: this.getNamaBulan(parseInt(bulan)),
          tahun: parseInt(tahun),
          isBefore25th: isCurrentMonth && isBefore25th
        }
      };
    } catch (error) {
      logger.error('Error getting all payrolls for admin:', error);
      throw error;
    }
  }

  calculateDetailedAbsensiStats(absensiList) {
    const stats = {
      totalKehadiran: 0,
      totalSKS: 0,
      totalInsentif: 0,
      jumlahTelat: 0,
      jumlahIzin: 0,
      jumlahTidakHadir: 0,
      jumlahBelumAbsen: 0,
      potonganTelat: 0,
      potonganIzin: 0,
      potonganLainnya: 0
    };

    if (!absensiList || absensiList.length === 0) {
      return stats;
    }

    absensiList.forEach(absensi => {
      // Convert string values to numbers
      const sks = Number(absensi.sks) || 0;
      const potonganTerlambat = Number(absensi.potonganTerlambat) || 0;
      const potonganTanpaKabar = Number(absensi.potonganTanpaKabar) || 0;
      const potonganTanpaSuratIzin = Number(absensi.potonganTanpaSuratIzin) || 0;
      const insentifKehadiran = Number(absensi.insentifKehadiran) || 0;

      switch (absensi.statusKehadiran) {
        case 'HADIR':
          stats.totalKehadiran++;
          stats.totalSKS += sks;
          stats.totalInsentif += insentifKehadiran;
          // Jika ada potongan terlambat meskipun status HADIR
          if (potonganTerlambat > 0) {
            stats.jumlahTelat++;
            stats.potonganTelat += potonganTerlambat;
          }
          break;

        case 'TERLAMBAT':
          stats.totalKehadiran++;
          stats.totalSKS += sks;
          stats.totalInsentif += insentifKehadiran;
          // Status TERLAMBAT otomatis ada potongan
          stats.jumlahTelat++;
          stats.potonganTelat += potonganTerlambat > 0 ? potonganTerlambat : 10000; // Default Rp 10.000
          break;

        case 'IZIN':
          stats.jumlahIzin++;
          if (potonganTanpaSuratIzin > 0) {
            stats.potonganIzin += potonganTanpaSuratIzin;
          }
          break;

        case 'SAKIT':
          stats.jumlahIzin++; // Sakit dihitung sama seperti izin
          if (potonganTanpaSuratIzin > 0) {
            stats.potonganIzin += potonganTanpaSuratIzin;
          }
          break;

        case 'TIDAK_HADIR':
          stats.jumlahTidakHadir++;
          if (potonganTanpaKabar > 0) {
            stats.potonganLainnya += potonganTanpaKabar;
          } else {
            // Default potongan tanpa kabar Rp 20.000
            stats.potonganLainnya += 20000;
          }
          break;

        case 'BELUM_ABSEN':
          stats.jumlahBelumAbsen++;
          // BELUM_ABSEN tidak dihitung dalam kalkulasi gaji
          break;

        default:
          // Handle status yang tidak dikenal
          logger.warn(`Unknown attendance status: ${absensi.statusKehadiran} for absensi ID: ${absensi.id}`);
          break;
      }
    });

    return stats;
  }

  getNamaBulan(bulan) {
    const namaBulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return namaBulan[bulan - 1] || '-';
  }

  async updatePayroll(id, data) {
    try {
      const payroll = await prisma.payroll.findUnique({
        where: { id },
        include: {
          guru: true,
          absensiGuru: true
        }
      });

      if (!payroll) {
        throw new NotFoundError(`Payroll dengan ID ${id} tidak ditemukan`);
      }

      if (payroll.status === 'SELESAI') {
        throw new BadRequestError('Payroll yang sudah selesai tidak dapat diubah');
      }

      const { tanggalKalkulasi, bulan, detail, catatan } = data;
      const updateData = {};

      if (tanggalKalkulasi !== undefined) {
        updateData.tanggalKalkulasi = FormatUtils.parseDate(tanggalKalkulasi);
      }
      // Jangan update bulan untuk menghindari inconsistency format
      // if (bulan !== undefined) {
      //   updateData.bulan = bulan;
      // }
      if (catatan !== undefined) {
        updateData.catatan = catatan;
      }

      let jumlahSKS, jumlahInsentif, jumlahTelat, jumlahIzin, jumlahDLL;
      let rateSKS = 35000, rateInsentif = 10000, rateTelat = 10000, rateIzin = 10000, rateDLL = 10000;
      if (detail) {
        jumlahSKS = detail?.mengajar?.jumlah ?? 0;
        jumlahInsentif = detail?.insentif?.jumlah ?? 0;
        jumlahTelat = detail?.potongan?.telat?.jumlah ?? 0;
        jumlahIzin = detail?.potongan?.izin?.jumlah ?? 0;
        jumlahDLL = detail?.potongan?.dll?.jumlah ?? 0;
        rateSKS = detail?.mengajar?.rate ?? 35000;
        rateInsentif = detail?.insentif?.rate ?? 10000;
        rateTelat = detail?.potongan?.telat?.rate ?? 10000;
        rateIzin = detail?.potongan?.izin?.rate ?? 10000;
        rateDLL = detail?.potongan?.dll?.rate ?? 10000;
      } else {
        // fallback ke absensi
        const absensiStats = this.calculateDetailedAbsensiStats(payroll.absensiGuru);
        jumlahSKS = absensiStats.totalSKS;
        jumlahInsentif = absensiStats.totalKehadiran;
        jumlahTelat = absensiStats.jumlahTelat;
        jumlahIzin = absensiStats.jumlahIzin;
        jumlahDLL = absensiStats.jumlahTidakHadir;
      }

      const totalMengajar = jumlahSKS * rateSKS;
      const totalInsentif = jumlahInsentif * rateInsentif;
      const totalPotongan = (jumlahTelat * rateTelat) + (jumlahIzin * rateIzin) + (jumlahDLL * rateDLL);
      const totalGaji = totalMengajar + totalInsentif - totalPotongan;

      // Log the raw values for debugging
      logger.info('Raw calculation values:', {
        jumlahSKS,
        rateSKS,
        totalMengajar,
        jumlahInsentif,
        rateInsentif,
        totalInsentif,
        jumlahTelat,
        rateTelat,
        jumlahIzin,
        rateIzin,
        jumlahDLL,
        rateDLL,
        totalPotongan,
        totalGaji
      });

      // Ensure values stay within DECIMAL(10,2) range (max 99999999.99)
      const MAX_VALUE = 99999999.99;

      const safeGajiPokok = Math.min(Math.max(Number(totalMengajar.toFixed(2)), 0), MAX_VALUE);
      const safeInsentif = Math.min(Math.max(Number(totalInsentif.toFixed(2)), 0), MAX_VALUE);
      const safePotongan = Math.min(Math.max(Number(totalPotongan.toFixed(2)), 0), MAX_VALUE);
      const safeTotalGaji = Math.min(Math.max(Number(totalGaji.toFixed(2)), 0), MAX_VALUE);

      // Log the safe values
      logger.info('Safe values for database:', {
        safeGajiPokok,
        safeInsentif,
        safePotongan,
        safeTotalGaji
      });

      // Validate if potongan exceeds total earnings
      if (safePotongan > (safeGajiPokok + safeInsentif)) {
        throw new BadRequestError('Total potongan tidak boleh melebihi total pendapatan (gaji pokok + insentif)');
      }

      updateData.gajiPokok = safeGajiPokok;
      updateData.insentif = safeInsentif;
      updateData.potongan = safePotongan;
      updateData.totalGaji = safeTotalGaji;

      const updated = await prisma.payroll.update({
        where: { id },
        data: updateData,
        include: {
          guru: {
            select: {
              nama: true,
              nip: true,
              noRekening: true,
              namaBank: true
            }
          },
          absensiGuru: {
            where: {
              tanggal: {
                contains: `-${bulan || payroll.bulan}-${payroll.tahun}`
              }
            },
            select: {
              id: true,
              tanggal: true,
              statusKehadiran: true,
              sks: true,
              potonganTerlambat: true,
              potonganTanpaKabar: true,
              potonganTanpaSuratIzin: true,
              insentifKehadiran: true,
              kelasProgram: {
                select: {
                  tipeKelas: true
                }
              }
            }
          },
          payrollDisbursement: true
        }
      });

      logger.info(`Updated payroll with ID: ${id}`);
      return updated;
    } catch (error) {
      logger.error(`Error updating payroll with ID ${id}:`, error);
      throw error;
    }
  }

  getDisbursementStatus(payrollDisbursement) {
    if (!payrollDisbursement) {
      return {
        status: 'PENDING',
        tanggalProses: null
      };
    }

    if (payrollDisbursement.xenditDisbursement) {
      return {
        status: payrollDisbursement.xenditDisbursement.xenditStatus,
        tanggalProses: payrollDisbursement.tanggalProses
      };
    }

    return {
      status: 'DIPROSES',
      tanggalProses: payrollDisbursement.tanggalProses
    };
  }

  calculateAbsensiStats(absensiList) {
    const stats = {
      totalKehadiran: 0,
      totalSKS: 0,
      totalInsentif: 0,
      totalPotongan: 0,
      rincianKelas: {
        GROUP: { sks: 0, honor: 0 },
        PRIVATE: { sks: 0, honor: 0 },
        SUBSTITUTE: { sks: 0, honor: 0 },
        ONLINE: { sks: 0, honor: 0 }
      },
      rincianKehadiran: {
        hadir: 0,
        terlambat: 0,
        izin: 0,
        sakit: 0,
        tidakHadir: 0,
        belumAbsen: 0
      }
    };

    const HONOR_RATES = {
      GROUP: 35000,
      PRIVATE: 35000,
      SUBSTITUTE: 25000,
      ONLINE: 25000
    };

    absensiList.forEach(absensi => {
      // Update rincian kehadiran berdasarkan status
      const statusKey = absensi.statusKehadiran.toLowerCase().replace('_', '');
      if (stats.rincianKehadiran.hasOwnProperty(statusKey)) {
        stats.rincianKehadiran[statusKey]++;
      }

      // Hanya HADIR dan TERLAMBAT yang dihitung untuk gaji
      if (absensi.statusKehadiran === 'HADIR' || absensi.statusKehadiran === 'TERLAMBAT') {
        stats.totalKehadiran++;
        stats.totalSKS += absensi.sks;

        const tipeKelas = absensi.kelasProgram.tipeKelas;
        if (stats.rincianKelas[tipeKelas]) {
          stats.rincianKelas[tipeKelas].sks += absensi.sks;
          stats.rincianKelas[tipeKelas].honor += absensi.sks * HONOR_RATES[tipeKelas];
        }

        if (absensi.insentifKehadiran) {
          stats.totalInsentif += Number(absensi.insentifKehadiran);
        }
      }

      // Hitung potongan berdasarkan status dan field yang ada
      if (absensi.potonganTerlambat) {
        stats.totalPotongan += Number(absensi.potonganTerlambat);
      }
      if (absensi.potonganTanpaKabar) {
        stats.totalPotongan += Number(absensi.potonganTanpaKabar);
      }
      if (absensi.potonganTanpaSuratIzin) {
        stats.totalPotongan += Number(absensi.potonganTanpaSuratIzin);
      }

      // Default potongan untuk status tertentu jika tidak ada field potongan
      if (absensi.statusKehadiran === 'TERLAMBAT' && !absensi.potonganTerlambat) {
        stats.totalPotongan += 10000; // Default Rp 10.000 untuk terlambat
      }
      if (absensi.statusKehadiran === 'TIDAK_HADIR' && !absensi.potonganTanpaKabar) {
        stats.totalPotongan += 20000; // Default Rp 20.000 untuk tidak hadir tanpa kabar
      }
    });

    return stats;
  }

  async getAllPayrollsForGuru(guruId, filters = {}) {
    try {
      const { page = 1, limit = 10, monthYear } = filters;
      const { bulan, tahun } = this.parseMonthYearFilter(monthYear);

      // Get guru data first
      const guru = await prisma.guru.findUnique({
        where: { id: guruId },
        select: {
          id: true,
          nama: true,
          nip: true,
          noRekening: true,
          namaBank: true
        }
      });

      if (!guru) {
        throw new NotFoundError('Guru tidak ditemukan');
      }

      // Get payroll data for this guru
      const payrollData = await prisma.payroll.findMany({
        where: {
          guruId,
          bulan,  // Format MM: "08"
          tahun
        },
        include: {
          absensiGuru: {
            where: {
              tanggal: {
                contains: `-${bulan}-${tahun}`
              }
            },
            select: {
              id: true,
              tanggal: true,
              jamMasuk: true,
              statusKehadiran: true,
              sks: true,
              terlambat: true,
              menitTerlambat: true,
              potonganTerlambat: true,
              potonganTanpaKabar: true,
              potonganTanpaSuratIzin: true,
              insentifKehadiran: true,
              kelasProgram: {
                select: {
                  tipeKelas: true
                }
              }
            }
          },
          payrollDisbursement: {
            include: {
              xenditDisbursement: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Check if current date is before the 25th of the month
      const currentDate = moment();
      const targetMonth = moment(`${tahun}-${bulan}-01`);
      const isBefore25th = currentDate.isBefore(targetMonth.clone().date(25));
      const isCurrentMonth = currentDate.format('MM-YYYY') === `${bulan}-${tahun}`;

      let formattedData;

      if (payrollData.length === 0) {
        // No payroll data exists
        if (isCurrentMonth && isBefore25th) {
          // Before 25th of current month - payroll not calculated yet
          formattedData = [{
            id: null,
            namaGuru: guru.nama,
            idGuru: guru.nip || guru.id,
            bulan: this.getNamaBulan(parseInt(bulan)),
            bulanAngka: parseInt(bulan),
            tahun: parseInt(tahun),
            status: 'BELUM_DIHITUNG',
            paymentStatus: null,
            tanggalKalkulasi: null,
            catatan: null,
            gajiBersih: 0,
            detail: {
              mengajar: { jumlah: 0, sksRate: 35000, total: 0 },
              insentif: { jumlah: 0, rate: 10000, total: 0 },
              potongan: {
                telat: { jumlah: 0, rate: 10000, total: 0 },
                izin: { jumlah: 0, rate: 10000, total: 0 },
                dll: { jumlah: 0, rate: 10000, total: 0 },
                totalPotongan: 0
              }
            },
            message: 'Payroll akan dihitung otomatis pada tanggal 25'
          }];
        } else {
          // Past month or after 25th - no payroll data
          formattedData = [{
            id: null,
            namaGuru: guru.nama,
            idGuru: guru.nip || guru.id,
            bulan: this.getNamaBulan(parseInt(bulan)),
            bulanAngka: parseInt(bulan),
            tahun: parseInt(tahun),
            status: 'TIDAK_ADA_DATA',
            paymentStatus: null,
            tanggalKalkulasi: null,
            catatan: null,
            gajiBersih: 0,
            detail: {
              mengajar: { jumlah: 0, sksRate: 35000, total: 0 },
              insentif: { jumlah: 0, rate: 10000, total: 0 },
              potongan: {
                telat: { jumlah: 0, rate: 10000, total: 0 },
                izin: { jumlah: 0, rate: 10000, total: 0 },
                dll: { jumlah: 0, rate: 10000, total: 0 },
                totalPotongan: 0
              }
            },
            message: 'Tidak ada data payroll untuk periode ini'
          }];
        }
      } else {
        // Payroll data exists - format as before
        formattedData = payrollData.map(payroll => {
          const absensiStats = this.calculateAbsensiStats(payroll.absensiGuru);
          const disbursementStatus = this.getDisbursementStatus(payroll.payrollDisbursement);
          const totalMengajar = absensiStats.totalSKS * 35000;
          const totalInsentif = absensiStats.totalInsentif;
          const totalPotongan = absensiStats.totalPotongan;

          return {
            id: payroll.id,
            namaGuru: guru.nama,
            idGuru: guru.nip || guru.id,
            bulan: this.getNamaBulan(parseInt(payroll.bulan)),
            bulanAngka: parseInt(payroll.bulan),
            tahun: payroll.tahun,
            status: payroll.status,
            paymentStatus: payroll.payrollDisbursement?.xenditDisbursement?.xenditStatus,
            tanggalKalkulasi: payroll.tanggalKalkulasi ? moment(payroll.tanggalKalkulasi).format(DATE_FORMATS.DEFAULT) : null,
            catatan: payroll.catatan,
            gajiBersih: totalMengajar + totalInsentif - totalPotongan,
            detail: {
              mengajar: {
                jumlah: absensiStats.totalSKS,
                sksRate: 35000,
                total: totalMengajar
              },
              insentif: {
                jumlah: absensiStats.totalKehadiran,
                rate: 10000,
                total: totalInsentif
              },
              potongan: {
                telat: {
                  jumlah: absensiStats.rincianKehadiran.tidakHadir,
                  rate: 10000,
                  total: absensiStats.totalPotongan
                },
                izin: {
                  jumlah: absensiStats.rincianKehadiran.izin,
                  rate: 10000,
                  total: 0
                },
                dll: {
                  jumlah: absensiStats.rincianKehadiran.sakit,
                  rate: 10000,
                  total: 0
                },
                totalPotongan: absensiStats.totalPotongan
              }
            }
          };
        });
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = formattedData.slice(startIndex, endIndex);

      const totalItems = formattedData.length;
      const totalPages = Math.ceil(totalItems / limit);

      return {
        data: paginatedData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        summary: {
          guruId: guru.id,
          namaGuru: guru.nama,
          bulan: this.getNamaBulan(parseInt(bulan)),
          tahun: parseInt(tahun),
          isBefore25th: isCurrentMonth && isBefore25th
        }
      };
    } catch (error) {
      logger.error('Error getting payrolls for guru:', error);
      throw error;
    }
  }

  async batchPayrollDisbursement(payrollIds) {
    if (!Array.isArray(payrollIds) || payrollIds.length === 0) {
      throw new BadRequestError('payrollIds harus berupa array dan tidak boleh kosong');
    }

    const payrolls = await prisma.payroll.findMany({
      where: { id: { in: payrollIds } },
      include: {
        guru: { select: { nama: true, namaBank: true, noRekening: true } }
      }
    });

    if (payrolls.length === 0) throw new NotFoundError('Payroll tidak ditemukan');

    // Build disbursement items
    const disbursements = payrolls.map((payroll, idx) => ({
      external_id: `payroll-${payroll.id}`,
      bank_code: this.mapBankNameToXenditCode(payroll.guru.namaBank),
      bank_account_name: payroll.guru.nama,
      bank_account_number: payroll.guru.noRekening,
      description: `Payroll ${payroll.bulan}/${payroll.tahun} - ${payroll.guru.nama}`,
      amount: Number(payroll.totalGaji)
    }));

    const batchPayload = {
      reference: `payroll-batch-${Date.now()}`,
      disbursements
    };

    try {
      const response = await axios.post(
        'https://api.xendit.co/batch_disbursements',
        batchPayload,
        {
          auth: { username: process.env.XENDIT_SECRET_KEY, password: '' },
          headers: { 'Content-Type': 'application/json' }
        }
      );

      // Save batch disbursement record
      const batchDisbursement = await prisma.payrollBatchDisbursement.create({
        data: {
          xenditBatchId: response.data.id,
          reference: response.data.reference,
          status: response.data.status,
          totalAmount: response.data.total_uploaded_amount,
          totalCount: response.data.total_uploaded_count,
          payrollIds: payrollIds
        }
      });

      // Update payroll status to DIPROSES
      await prisma.payroll.updateMany({
        where: { id: { in: payrollIds } },
        data: { status: 'DIPROSES' }
      });

      logger.info('Batch payroll disbursement sukses:', response.data);

      return {
        status: 'SUCCESS',
        batch: response.data,
        batchDisbursementId: batchDisbursement.id
      };
    } catch (err) {
      logger.error('Gagal batch payroll disbursement:', err.response?.data || err.message);
      throw new BadRequestError('Gagal batch payroll disbursement: ' + (err.response?.data?.message || err.message));
    }
  }

  async handleDisbursementCallback(callbackData) {
    try {
      logger.info('Received disbursement callback:', callbackData);

      const { id, status, disbursements } = callbackData;

      const batchDisbursement = await prisma.payrollBatchDisbursement.findFirst({
        where: { xenditBatchId: id }
      });

      if (!batchDisbursement) {
        logger.error(`Batch disbursement not found for ID: ${id}`);
        throw new NotFoundError(`Batch disbursement not found for ID: ${id}`);
      }

      await prisma.payrollBatchDisbursement.update({
        where: { id: batchDisbursement.id },
        data: {
          status: status,
          updatedAt: new Date()
        }
      });

      for (const disbursement of disbursements) {
        const payrollId = disbursement.external_id.replace('payroll-', '');

        // Create disbursement record
        await prisma.payrollDisbursement.create({
          data: {
            payrollId,
            amount: disbursement.amount,
            tanggalProses: moment().format(DATE_FORMATS.DEFAULT),
            xenditDisbursement: {
              create: {
                xenditDisbursementId: disbursement.id,
                xenditExternalId: disbursement.external_id,
                xenditAmount: disbursement.amount,
                xenditStatus: disbursement.status,
                xenditCreatedAt: disbursement.created,
                xenditUpdatedAt: disbursement.updated,
                rawResponse: disbursement
              }
            }
          }
        });

        let payrollStatus = 'DIPROSES';
        if (disbursement.status === 'COMPLETED') {
          payrollStatus = 'SELESAI';
        } else if (disbursement.status === 'FAILED') {
          payrollStatus = 'GAGAL';
        }

        const updatedPayroll = await prisma.payroll.update({
          where: { id: payrollId },
          data: { status: payrollStatus },
          include: {
            guru: {
              select: {
                nama: true
              }
            }
          }
        });

        // Auto-sync to Finance when disbursement is successful
        if (disbursement.status === 'COMPLETED') {
          try {
            await financeService.createFromPayrollDisbursement({
              id: updatedPayroll.id,
              totalGaji: updatedPayroll.totalGaji,
              bulan: updatedPayroll.bulan,
              tahun: updatedPayroll.tahun,
              guru: updatedPayroll.guru
            });
          } catch (financeError) {
            // Log error but don't fail the main disbursement processing
            logger.error('Failed to auto-sync payroll to finance:', {
              payrollId: updatedPayroll.id,
              error: financeError.message
            });
          }
        }
      }

      logger.info(`Successfully processed disbursement callback for batch ID: ${id}`);
      return { success: true };
    } catch (error) {
      logger.error('Error handling disbursement callback:', error);
      throw error;
    }
  }

  mapBankNameToXenditCode(namaBank) {
    const mapping = {
      'MANDIRI': 'MANDIRI',
      'BCA': 'BCA',
      'BNI': 'BNI',
      'BRI': 'BRI',
      'PERMATA': 'PERMATA',
      'BSI': 'BSI',
    };
    return mapping[namaBank.toUpperCase()] || namaBank.toUpperCase();
  }

}

module.exports = new PayrollService();