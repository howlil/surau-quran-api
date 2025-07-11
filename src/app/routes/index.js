const express = require('express');
const router = express.Router();
const authRoutes = require('./routers/auth.routes');
const kelasRoutes = require('./routers/kelas.routes');
const programRoutes = require('./routers/program.routes');
const jamMengajarRoutes = require('./routers/jam-mengajar.routes');
const guruRoutes = require('./routers/guru.routes');
const voucherRoutes = require('./routers/voucher.routes');
const siswaRoutes = require('./routers/siswa.routes');
const absensiRoutes = require('./routers/absensi.routes');
const statisticsRoutes = require('./routers/statistics.routes');
const sppRoutes = require('./routers/spp.routes');
const paymentRoutes = require('./routers/payment.routes');
const payrollRoutes = require('./routers/payroll.routes');
const testimoniRoutes = require('./routers/testimoni.routes');
const galeriRoutes = require('./routers/galeri.routes');
const financeRoutes = require('./routers/finance.routes');
const sppReminderRoutes = require('./routers/spp-reminder.routes');

// API Routes
router.use(authRoutes);
router.use(kelasRoutes);
router.use(programRoutes);
router.use(jamMengajarRoutes);
router.use(guruRoutes);
router.use(voucherRoutes);
router.use(siswaRoutes);
router.use(absensiRoutes);
router.use(statisticsRoutes);
router.use(sppRoutes);
router.use(paymentRoutes);
router.use(payrollRoutes);
router.use(testimoniRoutes);
router.use(galeriRoutes);
router.use(financeRoutes);
router.use(sppReminderRoutes);

module.exports = router;