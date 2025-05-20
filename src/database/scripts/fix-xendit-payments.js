const { prisma } = require('../../lib/config/prisma.config');
const { logger } = require('../../lib/config/logger.config');

/**
 * This script finds and fixes any unmatched Xendit payments by:
 * 1. Finding XenditCallbackInvoice records with eventType 'INVOICE_STATUS_UPDATED_UNMATCHED'
 * 2. Trying to match them with XenditPayment records by external ID
 * 3. Updating the XenditPayment records with the correct invoice ID
 */
async function fixUnmatchedXenditPayments() {
    try {
        logger.info('Starting to fix unmatched Xendit payments...');

        // Get all unmatched callbacks
        const unmatchedCallbacks = await prisma.xenditCallbackInvoice.findMany({
            where: {
                eventType: 'INVOICE_STATUS_UPDATED_UNMATCHED'
            }
        });

        logger.info(`Found ${unmatchedCallbacks.length} unmatched Xendit callbacks`);

        let fixedCount = 0;
        let stillUnmatchedCount = 0;

        for (const callback of unmatchedCallbacks) {
            // Parse the raw response to get the external ID
            const rawResponse = callback.rawResponse;
            const externalId = rawResponse.external_id;
            const invoiceId = rawResponse.id;

            if (!externalId || !invoiceId) {
                logger.warn(`Callback ${callback.id} missing external_id or id`, { rawResponse });
                stillUnmatchedCount++;
                continue;
            }

            // Try to find a matching payment by external ID
            const xenditPayment = await prisma.xenditPayment.findFirst({
                where: {
                    xenditExternalId: externalId
                },
                include: {
                    pembayaran: true
                }
            });

            if (xenditPayment) {
                // Update the xenditInvoiceId to match Xendit's value
                await prisma.xenditPayment.update({
                    where: { id: xenditPayment.id },
                    data: { xenditInvoiceId: invoiceId }
                });

                // Update the callback to link it to the payment
                await prisma.xenditCallbackInvoice.update({
                    where: { id: callback.id },
                    data: {
                        xenditPaymentId: xenditPayment.id,
                        eventType: 'INVOICE_STATUS_UPDATED_FIXED'
                    }
                });

                // Update payment status if needed
                if (rawResponse.status === 'PAID' || rawResponse.status === 'SETTLED') {
                    await prisma.pembayaran.update({
                        where: { id: xenditPayment.pembayaranId },
                        data: { statusPembayaran: 'LUNAS' }
                    });

                    // Check if this is linked to pendaftaran or periodeSpp and update accordingly
                    if (xenditPayment.pembayaran) {
                        if (xenditPayment.pembayaran.pendaftaran) {
                            await prisma.pendaftaran.update({
                                where: { id: xenditPayment.pembayaran.pendaftaran.id },
                                data: { statusVerifikasi: 'DIVERIFIKASI' }
                            });
                        }

                        if (xenditPayment.pembayaran.periodeSpp) {
                            await prisma.periodeSpp.update({
                                where: { id: xenditPayment.pembayaran.periodeSpp.id },
                                data: { statusPembayaran: 'LUNAS' }
                            });
                        }
                    }
                }

                logger.info(`Fixed unmatched payment: ${externalId} -> ${invoiceId}`);
                fixedCount++;
            } else {
                logger.warn(`Could not find payment with external ID: ${externalId}`);
                stillUnmatchedCount++;
            }
        }

        logger.info(`Fix completed: ${fixedCount} fixed, ${stillUnmatchedCount} still unmatched`);

    } catch (error) {
        logger.error('Error fixing unmatched Xendit payments:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
fixUnmatchedXenditPayments()
    .then(() => {
        logger.info('Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        logger.error('Script failed:', error);
        process.exit(1);
    }); 