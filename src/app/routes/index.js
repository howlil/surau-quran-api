
const express = require('express');
const router = express.Router();
const authRoutes = require('./routers/auth.routes');
const kelasRoutes = require('./routers/kelas.routes');
const programRoutes = require('./routers/program.routes');
const jamMengajarRoutes = require('./routers/jam-mengajar.routes');



router.use(authRoutes);
router.use(kelasRoutes);
router.use(programRoutes);
router.use(jamMengajarRoutes);

module.exports = router;