const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const SppReminderController = require('../../controller/spp-reminder.controller');

// API untuk SPP Reminder (hanya untuk SUPER_ADMIN)
router.post(
    '/v1/spp-reminder/send',
    authMiddleware.authenticate,
    authMiddleware.authorize(['SUPER_ADMIN']),
    SppReminderController.sendSppReminders
);


module.exports = router; 