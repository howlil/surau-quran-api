const userFactory = require('./user.factory');
const adminFactory = require('./admin.factory');
const guruFactory = require('./guru.factory');
const siswaFactory = require('./siswa.factory');
const kelasFactory = require('./kelas.factory');
const programFactory = require('./program.factory');
const jamMengajarFactory = require('./jam-mengajar.factory');
const kelasProgramFactory = require('./kelas-program.factory');
const programSiswaFactory = require('./program-siswa.factory');
const jadwalSiswaFactory = require('./jadwal-siswa.factory');
const riwayatStatusSiswaFactory = require('./riwayat-status-siswa.factory');
const absensiSiswaFactory = require('./absensi-siswa.factory');
const absensiGuruFactory = require('./absensi-guru.factory');
const voucherFactory = require('./voucher.factory');
const pembayaranFactory = require('./pembayaran.factory');
const pendaftaranFactory = require('./pendaftaran.factory');
const pendaftaranJadwalFactory = require('./pendaftaran-jadwal.factory');
const periodeSppFactory = require('./periode-spp.factory');
const xenditPaymentFactory = require('./xendit-payment.factory');
const xenditCallbackInvoiceFactory = require('./xendit-callback-invoice.factory');
const payrollFactory = require('./payroll.factory');
const payrollDisbursementFactory = require('./payroll-disbursement.factory');
const xenditDisbursementFactory = require('./xendit-disbursement.factory');
const xenditCallbackDisbursementFactory = require('./xendit-callback-disbursement.factory');
const tokenFactory = require('./token.factory');

module.exports = {
  userFactory,
  adminFactory,
  guruFactory,
  siswaFactory,
  kelasFactory,
  programFactory,
  jamMengajarFactory,
  kelasProgramFactory,
  programSiswaFactory,
  jadwalSiswaFactory,
  riwayatStatusSiswaFactory,
  absensiSiswaFactory,
  absensiGuruFactory,
  voucherFactory,
  pembayaranFactory,
  pendaftaranFactory,
  pendaftaranJadwalFactory,
  periodeSppFactory,
  xenditPaymentFactory,
  xenditCallbackInvoiceFactory,
  payrollFactory,
  payrollDisbursementFactory,
  xenditDisbursementFactory,
  xenditCallbackDisbursementFactory,
  tokenFactory,
};