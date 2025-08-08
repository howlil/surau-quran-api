const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const payrollController = require('../../controller/payroll.controller');
const payrollValidation = require('../../validation/payroll.validation');

router.patch(
  '/v1/payroll/:id',
  authMiddleware.authenticate,
  authMiddleware.authorizeModule('payroll'),
  validationMiddleware.validateBody(payrollValidation.updatePayroll()),
  payrollController.updatePayroll
);

router.get(
  '/v1/payroll',
  authMiddleware.authenticate,
  authMiddleware.authorizeModule('payroll'),
  validationMiddleware.validateQuery(payrollValidation.getAllPayrollsForAdmin()),
  payrollController.getAllPayrollsForAdmin
);

router.get(
  '/v1/guru/payroll',
  authMiddleware.authenticate,
  authMiddleware.authorize(['GURU']),
  validationMiddleware.validateQuery(payrollValidation.getAllPayrollsForGuru()),
  payrollController.getAllPayrollsForGuru
);

router.post(
  '/v1/payroll/batch',
  authMiddleware.authenticate,
  authMiddleware.authorizeModule('payroll'),
  validationMiddleware.validateBody(payrollValidation.batchPayrollDisbursement()),
  payrollController.batchPayrollDisbursement
);

router.post(
  '/v1/payroll/callback',
  payrollController.handleDisbursementCallback
);

module.exports = router;