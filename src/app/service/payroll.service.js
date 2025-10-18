const prisma  = require('../../lib/config/prisma.config');
const ErrorFactory = require('../../lib/factories/error.factory');
const financeService = require('./finance.service');
const moment = require('moment');
const axios = require('axios');
const CommonServiceUtils = require('../../lib/utils/common.service.utils');
const logger = require('../../lib/config/logger.config');

class PayrollService {


  async getAllPayrollsForAdmin(filters = {}) {
    try {
      const { page = 1, limit = 10, monthYear } = filters;
      const { bulan, tahun } = CommonServiceUtils.parseMonthYearFilter(monthYear);


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
                  id: true
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


      // Debug: Log payroll data yang ditemukan
      payrollData.forEach(payroll => {
      });

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
              nipGuru: guru.nip,
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
              nipGuru: guru.nip,
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


        const absensiStats = this.calculateDetailedAbsensiStats(payroll.absensiGuru);


        // Use saved values if available, otherwise calculate from absensi
        let totalMengajar, totalInsentif, totalPotongan;

        if (payroll.gajiPokok && payroll.insentif !== null && payroll.potongan !== null) {
          // Use saved values
          totalMengajar = Number(payroll.gajiPokok);
          totalInsentif = Number(payroll.insentif || 0);
          totalPotongan = Number(payroll.potongan);
        } else {
          // Calculate from absensi
          totalMengajar = absensiStats.totalSKS * 35000;
          totalInsentif = absensiStats.totalInsentif;
          totalPotongan = absensiStats.potonganTelat + absensiStats.potonganIzin + absensiStats.potonganLainnya;
        }

        const detailData = {
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

        // Bulan sudah dalam format MM, langsung parse ke integer
        const bulanAngka = parseInt(payroll.bulan);

        return {
          id: payroll.id,
          namaGuru: guru.nama,
          nipGuru: guru.nip,
          bulan: this.getNamaBulan(bulanAngka),
          bulanAngka: bulanAngka,
          tahun: payroll.tahun,
          status: payroll.status,
          paymentStatus: payroll.payrollDisbursement?.xenditDisbursement?.xenditStatus,
          tanggalKalkulasi: payroll.tanggalKalkulasi ? CommonServiceUtils.formatDate(payroll.tanggalKalkulasi) : null,
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
      const totalPages = CommonServiceUtils.calculateTotalPages(totalItems, limit);

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
      logger.error(error);
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

    absensiList.forEach((absensi, index) => {
      // Convert string values to numbers
      const sks = CommonServiceUtils.safeNumber(absensi.sks);
      const potonganTerlambat = CommonServiceUtils.safeNumber(absensi.potonganTerlambat);
      const potonganTanpaKabar = CommonServiceUtils.safeNumber(absensi.potonganTanpaKabar);
      const potonganTanpaSuratIzin = CommonServiceUtils.safeNumber(absensi.potonganTanpaSuratIzin);
      const insentifKehadiran = CommonServiceUtils.safeNumber(absensi.insentifKehadiran);


      switch (absensi.statusKehadiran) {
        case 'HADIR':
          stats.totalKehadiran++;
          stats.totalSKS += sks;
          // Insentif kehadiran: 10000 per hari hadir (tidak dari field insentifKehadiran)
          stats.totalInsentif += 10000;
          // Jika ada potongan terlambat meskipun status HADIR
          if (potonganTerlambat > 0) {
            stats.jumlahTelat++;
            stats.potonganTelat += potonganTerlambat;
          }
          break;

        case 'TERLAMBAT':
          stats.totalKehadiran++;
          stats.totalSKS += sks;
          // Insentif kehadiran: 10000 per hari hadir (meskipun terlambat)
          stats.totalInsentif += 10000;
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
        throw ErrorFactory.notFound(`Payroll dengan ID ${id} tidak ditemukan`);
      }

      if (payroll.status === 'SELESAI') {
        throw ErrorFactory.badRequest('Payroll yang sudah selesai tidak dapat diubah');
      }

      const { tanggalKalkulasi, bulan, detail, catatan } = data;
      const updateData = {};

      // if (tanggalKalkulasi !== undefined) {
      //   updateData.tanggalKalkulasi = FormatUtils.parseDate(tanggalKalkulasi);
      // }
      // Jangan update bulan untuk menghindari inconsistency format
      // if (bulan !== undefined) {
      //   updateData.bulan = bulan;
      // }
      if (catatan !== undefined) {
        updateData.catatan = catatan;
      }

      // Get actual absensi data untuk validasi
      const absensiData = await prisma.absensiGuru.findMany({
        where: {
          guruId: payroll.guruId,
          tanggal: {
            contains: `-${payroll.bulan}-${payroll.tahun}`
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
          insentifKehadiran: true
        }
      });

      const absensiStats = this.calculateDetailedAbsensiStats(absensiData);



      let jumlahSKS, jumlahInsentif, jumlahTelat, jumlahIzin, jumlahDLL;
      let rateSKS = 35000, rateInsentif = 10000, rateTelat = 10000, rateIzin = 10000, rateDLL = 10000;

      if (detail) {
        // Validasi input sesuai dengan data absensi
        const inputSKS = detail?.mengajar?.jumlah ?? 0;
        const inputInsentif = detail?.insentif?.jumlah ?? 0;
        const inputTelat = detail?.potongan?.telat?.jumlah ?? 0;
        const inputIzin = detail?.potongan?.izin?.jumlah ?? 0;
        const inputDLL = detail?.potongan?.dll?.jumlah ?? 0;

        // Validasi SKS tidak boleh melebihi total SKS dari absensi
        if (inputSKS > absensiStats.totalSKS) {
          throw ErrorFactory.badRequest(`Jumlah SKS mengajar (${inputSKS}) tidak boleh melebihi total SKS dari absensi (${absensiStats.totalSKS})`);
        }

        // Validasi insentif tidak boleh melebihi total kehadiran
        if (inputInsentif > absensiStats.totalKehadiran) {
          throw ErrorFactory.badRequest(`Jumlah hari insentif (${inputInsentif}) tidak boleh melebihi total kehadiran dari absensi (${absensiStats.totalKehadiran})`);
        }

        // Validasi potongan terlambat tidak boleh melebihi data absensi
        if (inputTelat > absensiStats.jumlahTelat) {
          throw ErrorFactory.badRequest(`Jumlah potongan terlambat (${inputTelat}) tidak boleh melebihi data terlambat dari absensi (${absensiStats.jumlahTelat})`);
        }

        // Validasi potongan izin tidak boleh melebihi data absensi
        if (inputIzin > absensiStats.jumlahIzin) {
          throw ErrorFactory.badRequest(`Jumlah potongan izin (${inputIzin}) tidak boleh melebihi data izin dari absensi (${absensiStats.jumlahIzin})`);
        }

        // Validasi potongan lainnya tidak boleh melebihi data absensi
        if (inputDLL > absensiStats.jumlahTidakHadir) {
          throw ErrorFactory.badRequest(`Jumlah potongan lainnya (${inputDLL}) tidak boleh melebihi data tidak hadir dari absensi (${absensiStats.jumlahTidakHadir})`);
        }

        jumlahSKS = inputSKS;
        jumlahInsentif = inputInsentif;
        jumlahTelat = inputTelat;
        jumlahIzin = inputIzin;
        jumlahDLL = inputDLL;
        rateSKS = detail?.mengajar?.rate ?? 35000;
        rateInsentif = detail?.insentif?.rate ?? 10000;
        rateTelat = detail?.potongan?.telat?.rate ?? 10000;
        rateIzin = detail?.potongan?.izin?.rate ?? 10000;
        rateDLL = detail?.potongan?.dll?.rate ?? 10000;
      } else {
        // Gunakan data dari absensi
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

      // Ensure values stay within DECIMAL(10,2) range (max 99999999.99)
      const MAX_VALUE = 99999999.99;

      const safeGajiPokok = CommonServiceUtils.safeRound(totalMengajar, 2, MAX_VALUE);
      const safeInsentif = CommonServiceUtils.safeRound(totalInsentif, 2, MAX_VALUE);
      const safePotongan = CommonServiceUtils.safeRound(totalPotongan, 2, MAX_VALUE);
      const safeTotalGaji = CommonServiceUtils.safeRound(totalGaji, 2, MAX_VALUE);


      // Validate if potongan exceeds total earnings
      if (safePotongan > (safeGajiPokok + safeInsentif)) {
        throw ErrorFactory.badRequest('Total potongan tidak boleh melebihi total pendapatan (gaji pokok + insentif)');
      }

      updateData.gajiPokok = safeGajiPokok;
      updateData.insentif = safeInsentif;
      updateData.potongan = safePotongan;
      updateData.totalGaji = safeTotalGaji;

      const updated = await prisma.$transaction(async (tx) => {
        // Update payroll data
        const updatedPayroll = await tx.payroll.update({
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
            payrollDisbursement: true
          }
        });

        // Link absensi guru ke payroll ini untuk bulan yang sama
        await tx.absensiGuru.updateMany({
          where: {
            guruId: updatedPayroll.guruId,
            tanggal: {
              contains: `-${updatedPayroll.bulan}-${updatedPayroll.tahun}`
            },
            payrollId: null // Hanya update yang belum ter-link
          },
          data: {
            payrollId: updatedPayroll.id
          }
        });

        // Get updated absensi data
        const absensiGuru = await tx.absensiGuru.findMany({
          where: {
            payrollId: updatedPayroll.id
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
                id: true
              }
            }
          }
        });

        return {
          ...updatedPayroll,
          absensiGuru
        };
      });

      return updated;
    } catch (error) {
      logger.error(error);
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
      totalHonor: 0,
      rincianKehadiran: {
        hadir: 0,
        terlambat: 0,
        izin: 0,
        sakit: 0,
        tidakHadir: 0,
        belumAbsen: 0
      }
    };

    // Honor per SKS tetap (tidak lagi berdasarkan tipe kelas)

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

        // Honor per SKS tetap (tidak lagi berdasarkan tipe kelas)
        const honorPerSKS = 35000;
        stats.totalHonor += absensi.sks * honorPerSKS;

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
        throw ErrorFactory.notFound('Guru tidak ditemukan');
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
                  id: true
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
            tanggalKalkulasi: payroll.tanggalKalkulasi ? CommonServiceUtils.formatDate(payroll.tanggalKalkulasi) : null,
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
      const totalPages = CommonServiceUtils.calculateTotalPages(totalItems, limit);

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
      logger.error(error);
      throw error;
    }
  }

  async batchPayrollDisbursement(payrollIds) {
    CommonServiceUtils.validateArray(payrollIds, 'payrollIds');

    const payrolls = await prisma.payroll.findMany({
      where: { id: { in: payrollIds } },
      include: {
        guru: { select: { nama: true, namaBank: true, noRekening: true } }
      }
    });

    if (payrolls.length === 0) throw ErrorFactory.notFound('Payroll tidak ditemukan');

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


      return {
        status: 'SUCCESS',
        batch: response.data,
        batchDisbursementId: batchDisbursement.id
      };
    } catch (err) {
      throw ErrorFactory.badRequest('Gagal batch payroll disbursement: ' + (err.response?.data?.message || err.message));
    }
  }

  async handleDisbursementCallback(callbackData) {
    try {

      const { id, status, disbursements } = callbackData;

      const batchDisbursement = await prisma.payrollBatchDisbursement.findFirst({
        where: { xenditBatchId: id }
      });

      if (!batchDisbursement) {
        throw ErrorFactory.notFound(`Batch disbursement not found for ID: ${id}`);
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
            tanggalProses: CommonServiceUtils.getCurrentDate(),
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
         
          }
        }
      }

      return { success: true };
    } catch (error) {
      logger.error(error);
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