const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const SppReminderController = require('../../controller/spp-reminder.controller');

// API untuk SPP Reminder (hanya untuk admin)
router.post(
    '/v1/spp-reminder/send',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    SppReminderController.sendSppReminders
);


module.exports = router; 