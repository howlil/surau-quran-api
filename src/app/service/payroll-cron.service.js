// File: src/lib/services/payroll-cron.service.js
const cron = require('node-cron');
const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const moment = require('moment');
const { DATE_FORMATS } = require('../../lib/constants');

class PayrollCronService {

  static async generateMonthlyPayroll() {
    try {
      const bulan = moment().format('MM');  // Format "08" bukan "August"
      const tahun = moment().year();
      const periode = `${bulan} ${tahun}`;

      const gurus = await prisma.guru.findMany({
        include: {
          payroll: {
            where: {
              periode,
              tahun
            }
          }
        }
      });

      const results = [];
      const errors = [];

      for (const guru of gurus) {
        try {
          if (guru.payroll.length > 0) {
            continue;
          }

          // Get attendance data for the current month
          const absensiData = await prisma.absensiGuru.findMany({
            where: {
              guruId: guru.id,
              tanggal: {
                contains: `-${moment().format('MM')}-${tahun}`
              }
            }
          });

          // Honor per SKS tetap (tidak lagi berdasarkan tipe kelas)
          const HONOR_PER_SKS = 35000;

          let gajiPokok = 0;
          let totalInsentif = 0;
          let totalPotongan = 0;
          let totalSKS = 0;

          // Track daily SKS for incentive calculation
          const dailySKS = {};

          absensiData.forEach(absensi => {
            // Hanya HADIR dan TERLAMBAT yang dihitung untuk gaji
            if (absensi.statusKehadiran === 'HADIR' || absensi.statusKehadiran === 'TERLAMBAT') {
              // Add to base salary
              gajiPokok += absensi.sks * HONOR_PER_SKS;
              totalSKS += absensi.sks;

              // Track daily SKS for incentive
              if (!dailySKS[absensi.tanggal]) {
                dailySKS[absensi.tanggal] = 0;
              }
              dailySKS[absensi.tanggal] += absensi.sks;

              // Add attendance incentive if applicable
              if (absensi.insentifKehadiran) {
                totalInsentif += Number(absensi.insentifKehadiran);
              }
            }

            // Calculate penalties based on status
            switch (absensi.statusKehadiran) {
              case 'HADIR':
                // Jika HADIR tapi ada potongan terlambat
                if (absensi.potonganTerlambat) {
                  totalPotongan += Number(absensi.potonganTerlambat);
                }
                break;

              case 'TERLAMBAT':
                // Status TERLAMBAT otomatis ada potongan
                if (absensi.potonganTerlambat) {
                  totalPotongan += Number(absensi.potonganTerlambat);
                } else {
                  totalPotongan += 10000; // Default Rp 10.000 untuk terlambat
                }
                break;

              case 'IZIN':
              case 'SAKIT':
                // Potongan untuk izin tanpa surat
                if (absensi.potonganTanpaSuratIzin) {
                  totalPotongan += Number(absensi.potonganTanpaSuratIzin);
                }
                break;

              case 'TIDAK_HADIR':
                // Potongan untuk tidak hadir tanpa kabar
                if (absensi.potonganTanpaKabar) {
                  totalPotongan += Number(absensi.potonganTanpaKabar);
                } else {
                  totalPotongan += 20000; // Default Rp 20.000 untuk tidak hadir tanpa kabar
                }
                break;

              case 'BELUM_ABSEN':
                // BELUM_ABSEN tidak dihitung dalam kalkulasi gaji
                break;

              default:
                break;
            }
          });

          // Calculate attendance incentive (Rp 10,000 per day with minimum 2 SKS)
          Object.entries(dailySKS).forEach(([date, sks]) => {
            if (sks >= 2) {
              totalInsentif += 10000;
            }
          });

          const totalGaji = gajiPokok + totalInsentif - totalPotongan;

          const payroll = await prisma.payroll.create({
            data: {
              guruId: guru.id,
              periode,
              bulan,  // Sudah format MM dari line 12
              tahun,
              gajiPokok,
              insentif: totalInsentif,
              potongan: totalPotongan,
              totalGaji,
              status: 'DRAFT',
              tanggalKalkulasi: moment().toDate()
            }
          });

          // Update absensi guru untuk link ke payroll ini
          if (absensiData.length > 0) {
            await prisma.absensiGuru.updateMany({
              where: {
                id: {
                  in: absensiData.map(a => a.id)
                }
              },
              data: {
                payrollId: payroll.id
              }
            });
          }

          results.push({
            guruId: guru.id,
            nama: guru.nama,
            payrollId: payroll.id,
            totalSKS,
            gajiPokok,
            insentif: totalInsentif,
            potongan: totalPotongan,
            totalGaji: payroll.totalGaji
          });

        } catch (error) {
          errors.push({
            guruId: guru.id,
            nama: guru.nama,
            error: error.message
          });
        }
      }


      return {
        success: results,
        errors,
        summary: {
          totalProcessed: results.length,
          totalErrors: errors.length,
          periode
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async runManualPayrollGeneration(bulan, tahun) {

    try {
      // Convert bulan name to MM format if needed
      let bulanMM;
      if (bulan.length > 2) {
        // Jika input "Agustus" convert ke "08"
        const monthNumber = this.getMonthNumber(bulan);
        bulanMM = String(monthNumber).padStart(2, '0');
      } else {
        // Jika sudah format "08"
        bulanMM = bulan;
      }

      const periode = `${bulanMM} ${tahun}`;

      const gurus = await prisma.guru.findMany({
        include: {
          payroll: {
            where: {
              periode,
              tahun: Number(tahun)
            }
          }
        }
      });

      const results = [];
      const errors = [];

      for (const guru of gurus) {
        try {
          if (guru.payroll.length > 0) {
            errors.push({
              guruId: guru.id,
              nama: guru.nama,
              error: `Payroll periode ${periode} sudah ada`
            });
            continue;
          }

          const absensiData = await prisma.absensiGuru.findMany({
            where: {
              guruId: guru.id,
              tanggal: {
                contains: `${tahun}-${bulanMM}`
              }
            },
            include: {
              kelasProgram: {
                select: {
                  id: true
                }
              }
            }
          });

          // Calculate base salary based on SKS and class type
          // Honor per SKS tetap (tidak lagi berdasarkan tipe kelas)
          const HONOR_PER_SKS = 35000;

          let gajiPokok = 0;
          let totalInsentif = 0;
          let totalPotongan = 0;
          let totalSKS = 0;

          // Track daily SKS for incentive calculation
          const dailySKS = {};

          absensiData.forEach(absensi => {
            // Hanya HADIR dan TERLAMBAT yang dihitung untuk gaji
            if (absensi.statusKehadiran === 'HADIR' || absensi.statusKehadiran === 'TERLAMBAT') {
              // Add to base salary
              gajiPokok += absensi.sks * HONOR_PER_SKS;
              totalSKS += absensi.sks;

              // Track daily SKS for incentive
              if (!dailySKS[absensi.tanggal]) {
                dailySKS[absensi.tanggal] = 0;
              }
              dailySKS[absensi.tanggal] += absensi.sks;

              // Add attendance incentive if applicable
              if (absensi.insentifKehadiran) {
                totalInsentif += Number(absensi.insentifKehadiran);
              }
            }

            // Calculate penalties based on status
            switch (absensi.statusKehadiran) {
              case 'HADIR':
                // Jika HADIR tapi ada potongan terlambat
                if (absensi.potonganTerlambat) {
                  totalPotongan += Number(absensi.potonganTerlambat);
                }
                break;

              case 'TERLAMBAT':
                // Status TERLAMBAT otomatis ada potongan
                if (absensi.potonganTerlambat) {
                  totalPotongan += Number(absensi.potonganTerlambat);
                } else {
                  totalPotongan += 10000; // Default Rp 10.000 untuk terlambat
                }
                break;

              case 'IZIN':
              case 'SAKIT':
                // Potongan untuk izin tanpa surat
                if (absensi.potonganTanpaSuratIzin) {
                  totalPotongan += Number(absensi.potonganTanpaSuratIzin);
                }
                break;

              case 'TIDAK_HADIR':
                // Potongan untuk tidak hadir tanpa kabar
                if (absensi.potonganTanpaKabar) {
                  totalPotongan += Number(absensi.potonganTanpaKabar);
                } else {
                  totalPotongan += 20000; // Default Rp 20.000 untuk tidak hadir tanpa kabar
                }
                break;

              case 'BELUM_ABSEN':
                // BELUM_ABSEN tidak dihitung dalam kalkulasi gaji
                break;

              default:
                break;
            }
          });

          // Calculate attendance incentive (Rp 10,000 per day with minimum 2 SKS)
          Object.entries(dailySKS).forEach(([date, sks]) => {
            if (sks >= 2) {
              totalInsentif += 10000;
            }
          });

          const totalGaji = gajiPokok + totalInsentif - totalPotongan;

          const payroll = await prisma.payroll.create({
            data: {
              guruId: guru.id,
              periode,
              bulan: bulanMM,  // Gunakan format MM
              tahun: Number(tahun),
              gajiPokok,
              insentif: totalInsentif,
              potongan: totalPotongan,
              totalGaji,
              status: 'DRAFT',
              tanggalKalkulasi: moment().toDate()
            }
          });

          // Update absensi guru untuk link ke payroll ini
          if (absensiData.length > 0) {
            await prisma.absensiGuru.updateMany({
              where: {
                id: {
                  in: absensiData.map(a => a.id)
                }
              },
              data: {
                payrollId: payroll.id
              }
            });
          }

          results.push({
            guruId: guru.id,
            nama: guru.nama,
            payrollId: payroll.id,
            totalSKS,
            gajiPokok,
            insentif: totalInsentif,
            potongan: totalPotongan,
            totalGaji: payroll.totalGaji
          });
        } catch (error) {
          errors.push({
            guruId: guru.id,
            nama: guru.nama,
            error: error.message
          });
        }
      }


      return {
        success: results,
        errors,
        summary: {
          totalProcessed: results.length,
          totalErrors: errors.length,
          periode
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static getMonthNumber(bulanName) {
    const months = {
      'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4,
      'Mei': 5, 'Juni': 6, 'Juli': 7, 'Agustus': 8,
      'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
    };
    return months[bulanName] || 1;
  }
}

module.exports = PayrollCronService;