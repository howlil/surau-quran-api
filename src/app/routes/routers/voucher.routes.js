const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const voucherController = require('../../controller/voucher.controller');
const voucherValidation = require('../../validation/voucher.validation');

router.post(
  '/v1/voucher',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
  validationMiddleware.validateBody(voucherValidation.create()),
  voucherController.create
);

router.patch(
  '/v1/voucher/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
  validationMiddleware.validateBody(voucherValidation.update()),
  voucherController.update
);

router.delete(
  '/v1/voucher/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
  voucherController.delete
);



router.get(
  '/v1/voucher',
  authMiddleware.authenticate,
  authMiddleware.authorize(['SUPER_ADMIN', 'ADMIN_SURAU', 'ADMIN']),
  validationMiddleware.validateQuery(voucherValidation.getVoucherQuery()),
  voucherController.getAll
);

router.get(
  '/v1/voucher/:kodeVoucher',
  validationMiddleware.validateParams(voucherValidation.getVoucherByKode()),
  voucherController.getVoucherByKode
);


module.exports = router;