const express = require('express');
const router = express.Router();
const validationMiddleware = require('../../middleware/validation.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const payrollController = require('../../controller/payroll.controller');
const payrollValidation = require('../../validation/payroll.validation');

router.post(
  '/v1/payroll',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(payrollValidation.create()),
  payrollController.createPayroll
);

router.patch(
  '/v1/payroll/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(payrollValidation.update()),
  payrollController.updatePayroll
);

router.get(
  '/v1/payroll',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateQuery(payrollValidation.getAll()),
  payrollController.getAllPayrollsForAdmin
);

router.get(
  '/v1/payroll/:id/detail',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  payrollController.getPayrollDetailForEdit
);

router.patch(
  '/v1/payroll/:id/detail',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(payrollValidation.updateDetail()),
  payrollController.updatePayrollDetail
);

router.get(
  '/v1/guru/payroll',
  authMiddleware.authenticate,
  authMiddleware.authorize(['GURU']),
  validationMiddleware.validateQuery(payrollValidation.getForGuru()),
  payrollController.getPayrollForGuru
);

router.post(
  '/v1/payroll/generate-monthly',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(payrollValidation.generateMonthly()),
  payrollController.generateMonthlyPayroll
);

router.post(
  '/v1/payroll/generate-manual',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateBody(payrollValidation.generateMonthly()),
  payrollController.generateManualPayroll
);

router.get(
  '/v1/payroll/summary/overview',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validationMiddleware.validateQuery(payrollValidation.getSummary()),
  payrollController.getPayrollSummary
);

module.exports = router;