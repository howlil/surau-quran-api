# Xendit Integration Guide

## Common Issues and Solutions

### 1. Property Name Mismatches

**Issue**: Xendit API response properties don't match what the application expects.

**Solution**: Ensure your code uses the correct property names from the Xendit API response. These are the main properties returned by Xendit's Invoice API:

```javascript
{
  id: 'invoice-id',
  external_id: 'your-external-id',
  user_id: 'your-xendit-user-id',
  status: 'PENDING', // Could be PENDING, PAID, SETTLED, EXPIRED
  amount: 50000,
  payer_email: 'customer@example.com',
  description: 'Invoice description',
  invoice_url: 'https://checkout.xendit.co/web/invoice-id',
  expiry_date: '2023-01-01T00:00:00.000Z',
  available_banks: [...],
  available_retail_outlets: [...],
  available_ewallets: [...],
  available_qr_codes: [...],
  should_exclude_credit_card: false,
  should_send_email: true,
  created: '2022-01-01T00:00:00.000Z',
  updated: '2022-01-01T00:00:00.000Z',
  mid_label: 'your-label',
  currency: 'IDR',
  payment_method: 'BANK_TRANSFER',
  paid_amount: 50000,
  paid_at: '2023-01-01T00:00:00.000Z',
  payment_channel: 'BCA'
}
```

When saving to your database, make sure to map these properties correctly:

```javascript
await prisma.xenditPayment.create({
  data: {
    pembayaranId: payment.id,
    xenditInvoiceId: xenditInvoice.id,
    xenditExternalId: externalId,
    xenditPaymentUrl: xenditInvoice.invoice_url,        // Correct property name
    xenditPaymentChannel: xenditInvoice.payment_method,  // Correct property name
    xenditExpireDate: xenditInvoice.expiry_date,        // Correct property name
    xenditStatus: 'PENDING'
  }
});
```

### 2. Missing Required Parameters

**Issue**: "Required parameter requestParameters.data was null or undefined when calling createInvoice"

**Solution**: Always validate that all required parameters are provided when creating an invoice:

```javascript
// Required parameters for Xendit Invoice creation
const invoiceData = {
  externalId: 'your-unique-reference',  // Required
  amount: 50000,                        // Required
  payerEmail: 'customer@example.com',   // Required
  description: 'Payment description',   // Required
  
  // Optional but recommended
  successRedirectUrl: 'https://yoursite.com/success',
  failureRedirectUrl: 'https://yoursite.com/failure'
};

// Always validate before sending to Xendit
if (!invoiceData.externalId || !invoiceData.amount || 
    !invoiceData.payerEmail || !invoiceData.description) {
  throw new Error('Missing required parameters for invoice creation');
}
```

### 3. Webhook Callback Handling

**Issue**: Webhooks fail to process or create duplicate records

**Solution**:
- Always respond with a 200 status code, even if processing fails internally
- Use the transaction ID to avoid duplicate processing
- Handle edge cases like missing or malformed payment records

```javascript
// Controller should look like this:
const handleCallback = async (req, res) => {
  try {
    const callbackData = req.body;
    // Process the webhook
    await processWebhook(callbackData);
    
    // Always return success to Xendit
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    
    // Still return success to Xendit, but log the error
    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
};
```

## Debugging "requestParameters.data was null" Error

This specific error occurs when the Xendit SDK can't properly format the request parameters to send to the Xendit API. Here's a checklist to fix this issue:

### 1. Validate Xendit SDK Initialization

Ensure the Xendit SDK is properly initialized with all required parameters:

```javascript
const xenditClient = new Xendit({
  secretKey: 'your-secret-key',
  xenditApiVersion: '2019-02-04' // Use the appropriate API version
});
```

### 2. Create a Dedicated Payload Object

Always create a separate object for the invoice data before passing it to the SDK:

```javascript
// WRONG: Passing object directly to method
await xenditClient.Invoice.createInvoice({...});

// CORRECT: Create a dedicated object first
const invoiceData = {
  externalId: 'invoice-123',
  amount: Number(totalAmount), // Convert to number!
  payerEmail: 'customer@example.com',
  description: 'Payment description'
};

// Add optional parameters conditionally
if (process.env.FRONTEND_URL) {
  invoiceData.successRedirectUrl = `${process.env.FRONTEND_URL}/success`;
}

// Log the data before sending
console.log('Invoice data:', JSON.stringify(invoiceData, null, 2));

// Then pass the object to the SDK
const invoice = await xenditClient.Invoice.createInvoice(invoiceData);
```

### 3. Check Data Types

Ensure all parameters have the correct data types:

- `amount` should be a number (not a string or Decimal)
- `externalId` should be a string
- URLs should be complete with http:// or https://

### 4. Validate Xendit Class Instantiation

Make sure the Xendit SDK's Invoice class is available:

```javascript
if (!xenditClient.Invoice) {
  throw new Error('Xendit Invoice API not available');
}
```

### 5. Proper Error Handling

Catch and log errors with detailed information:

```javascript
try {
  const invoice = await xenditClient.Invoice.createInvoice(invoiceData);
  return invoice;
} catch (error) {
  logger.error('Xendit API error:', {
    message: error.message,
    stack: error.stack,
    data: invoiceData
  });
  throw error;
}
```

## Best Practices

### 1. Generate Consistent External IDs

```javascript
const generateExternalId = (prefix = 'INV') => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}_${timestamp}_${random}`;
};
```

### 2. Implement Proper Error Handling

```javascript
try {
  const invoice = await xenditClient.createInvoice(invoiceData);
  // Process success
} catch (error) {
  if (error.status === 400) {
    logger.error('Bad request:', error.message);
    // Handle validation errors
  } else if (error.status === 401) {
    logger.error('Authentication error:', error.message);
    // Handle authentication errors
  } else {
    logger.error('Unexpected error:', error);
    // Handle other errors
  }
}
```

### 3. Implement Data Recovery for Failed Callbacks

Create scripts or scheduled jobs to:
- Periodically check for pending payments
- Verify payment status directly with Xendit API
- Update local records that may have missed callbacks

### 4. Monitor Xendit Integration

- Log all Xendit API interactions
- Implement health checks for your integration
- Set up alerts for failures or mismatches

## Reference

- [Xendit API Documentation](https://developers.xendit.co/api-reference/)
- [Xendit Node.js Client](https://github.com/xendit/xendit-node) 