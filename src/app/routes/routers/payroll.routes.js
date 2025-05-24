// const express = require('express');
// const router = express.Router();
// const validationMiddleware = require('../../middleware/validation.middleware');
// const authMiddleware = require('../../middleware/auth.middleware');
// const payrollController = require('../../controller/payroll.controller');
// const payrollValidation = require('../../validation/payroll.validation');

// router.post(
//   '/v1/payroll',
//   authMiddleware.authenticate,
//   authMiddleware.authorize(['ADMIN']),
//   validationMiddleware.validateBody(payrollValidation.create()),
//   payrollController.createPayroll
// );

// router.patch(
//   '/v1/payroll/:id',
//   authMiddleware.authenticate,
//   authMiddleware.authorize(['ADMIN']),
//   validationMiddleware.validateBody(payrollValidation.update()),
//   payrollController.updatePayroll
// );

// router.delete(
//   '/v1/payroll/:id',
//   authMiddleware.authenticate,
//   authMiddleware.authorize(['ADMIN']),
//   payrollController.deletePayroll
// );

// router.get(
//   '/v1/payroll',
//   authMiddleware.authenticate,
//   authMiddleware.authorize(['ADMIN']),
//   validationMiddleware.validateQuery(payrollValidation.getAll()),
//   payrollController.getAllPayrolls
// );

// router.get(
//   '/v1/payroll/:id',
//   authMiddleware.authenticate,
//   authMiddleware.authorize(['ADMIN']),
//   payrollController.getPayrollById
// );

// router.post(
//   '/v1/payroll/:id/process',
//   authMiddleware.authenticate,
//   authMiddleware.authorize(['ADMIN']),
//   payrollController.processPayroll
// );

// router.post(
//   '/v1/payroll/generate-monthly',
//   authMiddleware.authenticate,
//   authMiddleware.authorize(['ADMIN']),
//   validationMiddleware.validateBody(payrollValidation.generateMonthly()),
//   payrollController.generateMonthlyPayroll
// );

// router.get(
//   '/v1/payroll/summary/overview',
//   authMiddleware.authenticate,
//   authMiddleware.authorize(['ADMIN']),
//   validationMiddleware.validateQuery(payrollValidation.getSummary()),
//   payrollController.getPayrollSummary
// );

// router.post(
//   '/v1/payroll/disburse-batch',
//   authMiddleware.authenticate,
//   authMiddleware.authorize(['ADMIN']),
//   validationMiddleware.validateBody(payrollValidation.disburseBatch()),
//   payrollController.disburseBatch
// );

// module.exports = router;