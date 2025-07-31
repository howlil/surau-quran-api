const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const rfidController = require('../../controller/rfid.controller');
const rfidValidation = require('../../validation/rfid.validation');

// Search users untuk pendaftaran RFID
router.get(
    '/v1/rfid/search',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateQuery(rfidValidation.searchUser()),
    rfidController.searchUser
);

// Get list semua user dengan status RFID
router.get(
    '/v1/rfid',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateQuery(rfidValidation.getRfidList()),
    rfidController.getRfidList
);




// Update RFID user
router.patch(
    '/v1/rfid/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    validationMiddleware.validateBody(rfidValidation.updateRfid()),
    rfidController.updateRfid
);

// Delete RFID user
router.delete(
    '/v1/rfid/:id',
    authMiddleware.authenticate,
    authMiddleware.authorize(['ADMIN']),
    rfidController.deleteRfid
);

module.exports = router; 