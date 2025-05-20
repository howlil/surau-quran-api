# Xendit Callback Handler Fix

## Issue Description

The system was encountering errors when processing Xendit invoice callbacks due to mismatches between the invoice IDs sent by Xendit and those stored in our database. This resulted in error messages like:

```
NotFoundError: Xendit payment dengan invoice ID 682b158788140e63face413e tidak ditemukan
```

The issue occurred because:
1. Sometimes, Xendit might create a new invoice ID for the same payment (possibly due to retries or system updates on their side)
2. Our system was only searching for payments using the exact invoice ID received in the callback

## Implemented Fixes

### 1. Enhanced Callback Handler Logic

The `handleInvoiceCallback` method in `PaymentService` has been updated to:
- First try to find the payment by the invoice ID as before
- If not found, attempt to find the payment by external ID (which should be consistent)
- If found by external ID, update our record with the new invoice ID from Xendit
- If still not found, log the unmatched callback data for later investigation

### 2. Resilient Error Handling in Controller

The webhook controller now:
- Always returns a 200 status code to Xendit, even if there's an error during processing
- This prevents Xendit from repeatedly retrying the same callback
- Logs detailed information about the error for debugging

### 3. Data Recovery Scripts

Two utility scripts have been created to fix existing data issues:

#### a. `fix-xendit-payments.js`
- Looks for unmatched callbacks stored in our database
- Attempts to match them with payments by external ID
- Updates payment records with correct invoice IDs
- Updates payment status if needed

#### b. `verify-xendit-invoices.js`
- Verifies all Xendit payment records against the Xendit API
- Updates any payment statuses that are incorrect
- Identifies inconsistencies in external IDs

## Running the Fix Scripts

To fix existing data inconsistencies:

```bash
# Navigate to the project folder
cd /path/to/project

# Run the fix script for unmatched callbacks
node src/database/scripts/fix-xendit-payments.js

# Verify all invoices against Xendit API
node src/database/scripts/verify-xendit-invoices.js
```

## Monitoring and Maintenance

After implementing the fixes:

1. Monitor the application logs for any new "unmatched" Xendit invoices
2. Check the XenditCallbackInvoice table for records with eventType 'INVOICE_STATUS_UPDATED_UNMATCHED'
3. Consider running the verification scripts periodically as a maintenance task

## Future Improvements

For future enhancements, consider:

1. Implementing a daily reconciliation job that verifies payment statuses with Xendit
2. Adding more robust logging for all Xendit interactions
3. Enhancing the XenditUtils with methods to query invoices by external ID
4. Setting up alerts for unmatched callbacks 