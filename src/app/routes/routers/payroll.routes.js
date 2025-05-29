const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const payrollController = require('../../controller/payroll.controller');
const payrollValidation = require('../../validation/payroll.validation');

router.patch(
  '/v1/payroll/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(payrollValidation.updatePayroll()),
  payrollController.updatePayroll
);

router.get(
  '/v1/payroll',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  payrollController.getAllPayrollsForAdmin
);

module.exports = router;