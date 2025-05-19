const paymentService = require('../service/payment.service');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');
const { logger } = require('../../lib/config/logger.config');

class PaymentController {
  invoiceCallback = ErrorHandler.asyncHandler(async (req, res) => {
    const callbackToken = HttpRequest.getHeaders(req, ['x-callback-token'])['x-callback-token'];
    const rawBody = req.body;
    
    logger.info('Received Xendit invoice callback');
    
    const result = await paymentService.processInvoiceCallback(
      rawBody, 
      rawBody, 
      callbackToken
    );
    
    if (!result) {
      return Http.Response.notFound(res, 'Payment not found');
    }
    
    return Http.Response.success(res, null, 'Callback processed successfully');
  });

  retryPayment = ErrorHandler.asyncHandler(async (req, res) => {
    const { paymentId } = HttpRequest.getUrlParams(req);
    const result = await paymentService.retryFailedPayment(paymentId);
    return Http.Response.success(res, result, 'Payment retry created successfully');
  });

  getPaymentHistory = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit', 'status', 'tipePembayaran', 'metodePembayaran'
    ]);
    const result = await paymentService.getPaymentHistory(filters);
    return Http.Response.success(res, result);
  });

  getPaymentDetails = ErrorHandler.asyncHandler(async (req, res) => {
    const { paymentId } = HttpRequest.getUrlParams(req);
    const result = await paymentService.getPaymentDetails(paymentId);
    return Http.Response.success(res, result);
  });

  getCallbackHistory = ErrorHandler.asyncHandler(async (req, res) => {
    const { externalId } = HttpRequest.getUrlParams(req);
    const history = await paymentService.getCallbackHistory(externalId);
    return Http.Response.success(res, history);
  });

  checkPaymentStatus = ErrorHandler.asyncHandler(async (req, res) => {
    const { invoiceId } = HttpRequest.getUrlParams(req);
    const result = await paymentService.getInvoice(invoiceId);
    return Http.Response.success(res, result);
  });

  expirePayment = ErrorHandler.asyncHandler(async (req, res) => {
    const { invoiceId } = HttpRequest.getUrlParams(req);
    const result = await paymentService.expireInvoice(invoiceId);
    return Http.Response.success(res, result, 'Payment expired successfully');
  });
}

module.exports = new PaymentController();