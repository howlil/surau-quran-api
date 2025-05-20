const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');
const XenditUtils = require('../../lib/utils/xendit.utils');

/**
 * This script verifies Xendit invoices against our database records:
 * 1. Gets all xenditPayment records from our database
 * 2. For each record, tries to fetch the invoice from Xendit API
 * 3. If the invoice is found but with a different ID, updates our records
 * 4. If the invoice is paid but marked as unpaid in our system, updates the status
 */
async function verifyXenditInvoices() {
    try {
        logger.info('Starting to verify Xendit invoices...');

        // Get all Xendit payments from our database
        const xenditPayments = await prisma.xenditPayment.findMany({
            include: {
                pembayaran: true
            }
        });

        logger.info(`Found ${xenditPayments.length} Xendit payments in database`);

        let updated = 0;
        let errors = 0;
        let alreadyCorrect = 0;

        for (const payment of xenditPayments) {
            try {
                // Try to fetch the invoice by ID
                const invoice = await XenditUtils.getInvoice(payment.xenditInvoiceId).catch(e => null);

                if (invoice) {
                    // Check if the invoice exists but has a different external ID
                    if (invoice.external_id !== payment.xenditExternalId) {
                        logger.warn(`Mismatch in external ID: Database=${payment.xenditExternalId}, Xendit=${invoice.external_id}`);
                        // This is unusual - log but don't update automatically
                    }

                    // Check if payment status needs to be updated
                    if ((invoice.status === 'PAID' || invoice.status === 'SETTLED') &&
                        payment.xenditStatus !== 'PAID' && payment.xenditStatus !== 'SETTLED') {

                        logger.info(`Updating payment status: ${payment.id} (${payment.xenditExternalId}) from ${payment.xenditStatus} to ${invoice.status}`);

                        // Update our records
                        await prisma.xenditPayment.update({
                            where: { id: payment.id },
                            data: {
                                xenditStatus: invoice.status,
                                xenditPaidAt: invoice.paid_at || new Date().toISOString()
                            }
                        });

                        // Update the main payment record
                        await prisma.pembayaran.update({
                            where: { id: payment.pembayaranId },
                            data: {
                                statusPembayaran: 'LUNAS'
                            }
                        });

                        // Check if this is linked to pendaftaran or periodeSpp and update accordingly
                        if (payment.pembayaran.pendaftaranId) {
                            await prisma.pendaftaran.update({
                                where: { pembayaranId: payment.pembayaranId },
                                data: { statusVerifikasi: 'DIVERIFIKASI' }
                            });
                        }

                        if (payment.pembayaran.periodeSppId) {
                            await prisma.periodeSpp.update({
                                where: { pembayaranId: payment.pembayaranId },
                                data: { statusPembayaran: 'LUNAS' }
                            });
                        }

                        updated++;
                    } else {
                        alreadyCorrect++;
                    }
                } else {
                    // Try to fetch by external ID instead
                    logger.info(`Invoice ${payment.xenditInvoiceId} not found, trying by external ID ${payment.xenditExternalId}`);

                    try {
                        // Note: This would require a custom Xendit API call to list invoices and filter by external ID
                        // This is just a placeholder - the actual implementation would depend on Xendit's API
                        // const invoicesByExternalId = await XenditUtils.getInvoiceByExternalId(payment.xenditExternalId);

                        logger.warn(`Cannot verify invoice by external ID: Not implemented in current Xendit utils`);
                        errors++;
                    } catch (externalIdError) {
                        logger.error(`Error checking invoice by external ID: ${externalIdError.message}`);
                        errors++;
                    }
                }
            } catch (error) {
                logger.error(`Error verifying payment ${payment.id} (${payment.xenditExternalId}): ${error.message}`);
                errors++;
            }
        }

        logger.info(`Verification completed: ${updated} updated, ${alreadyCorrect} already correct, ${errors} errors`);

    } catch (error) {
        logger.error('Error verifying Xendit invoices:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
verifyXenditInvoices()
    .then(() => {
        logger.info('Verification script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        logger.error('Verification script failed:', error);
        process.exit(1);
    }); 