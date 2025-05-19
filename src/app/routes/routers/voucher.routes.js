const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const voucherController = require('../../controller/voucher.controller');
const voucherValidation = require('../../validation/voucher.validation');

router.post(
  '/v1/voucher',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(voucherValidation.create()),
  voucherController.create
);

router.patch(
  '/v1/voucher/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(voucherValidation.update()),
  voucherController.update
);

router.delete(
  '/v1/voucher/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  voucherController.delete
);

router.get(
  '/v1/voucher/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  voucherController.getById
);

router.get(
  '/v1/voucher',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  voucherController.getAll
);

router.get(
  '/v1/voucher/code/:kodeVoucher',
  authMiddleware.authenticate,
  voucherController.getByCode
);

router.patch(
  '/v1/voucher/:id/toggle-status',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  voucherController.toggleStatus
);

router.get(
  '/v1/voucher/:id/usage-report',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  voucherController.getUsageReport
);

module.exports = router;