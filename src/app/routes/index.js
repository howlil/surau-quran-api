
const express = require('express');
const router = express.Router();
const authRoutes = require('./routers/auth.routes');
const kelasRoutes = require('./routers/kelas.routes');
const programRoutes = require('./routers/program.routes');
const jamMengajarRoutes = require('./routers/jam-mengajar.routes');
const guruRoutes = require('./routers/guru.routes');
const voucherRoutes = require('./routers/voucher.routes');
const siswaRoutes = require('./routers/siswa.routes');


router.use(authRoutes);
router.use(kelasRoutes);
router.use(programRoutes);
router.use(jamMengajarRoutes);
router.use(guruRoutes);
router.use(voucherRoutes);
router.use(siswaRoutes);

module.exports = router;