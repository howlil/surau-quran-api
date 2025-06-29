class XenditDisbursementFactory {
    static create(payrollDisbursementId, amount, status = 'COMPLETED') {
        const disbursementId = `DIS-${Math.random().toString(36).substring(7)}-${Date.now().toString().substring(7)}`;
        const externalId = `payroll-${Math.random().toString(36).substring(7)}`;

        // Random times in the last 30 days
        const currentDate = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(currentDate.getDate() - 30);

        const createdAt = new Date(thirtyDaysAgo.getTime() + Math.random() * (currentDate.getTime() - thirtyDaysAgo.getTime()));

        let updatedAt = null;
        if (status !== 'PENDING') {
            // Updated 1-24 hours after creation
            updatedAt = new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000);
        }

        // Generate realistic response based on status
        let rawResponse = null;
        if (status === 'COMPLETED') {
            rawResponse = {
                id: disbursementId,
                external_id: externalId,
                amount: Number(amount),
                bank_code: 'BCA',
                account_holder_name: 'Test Account',
                disbursement_description: 'Payroll disbursement',
                status: 'COMPLETED',
                created: createdAt.toISOString(),
                updated: updatedAt ? updatedAt.toISOString() : null
            };
        } else if (status === 'FAILED') {
            rawResponse = {
                id: disbursementId,
                external_id: externalId,
                amount: Number(amount),
                bank_code: 'BCA',
                account_holder_name: 'Test Account',
                disbursement_description: 'Payroll disbursement',
                status: 'FAILED',
                failure_code: 'INSUFFICIENT_BALANCE',
                created: createdAt.toISOString(),
                updated: updatedAt ? updatedAt.toISOString() : null
            };
        } else {
            rawResponse = {
                id: disbursementId,
                external_id: externalId,
                amount: Number(amount),
                bank_code: 'BCA',
                account_holder_name: 'Test Account',
                disbursement_description: 'Payroll disbursement',
                status: 'PENDING',
                created: createdAt.toISOString()
            };
        }

        return {
            payrollDisbursementId,
            xenditDisbursementId: disbursementId,
            xenditExternalId: externalId,
            xenditAmount: amount,
            xenditStatus: status,
            xenditCreatedAt: createdAt.toISOString(),
            xenditUpdatedAt: updatedAt ? updatedAt.toISOString() : null,
            rawResponse
        };
    }

    static createPending(payrollDisbursementId, amount) {
        return this.create(payrollDisbursementId, amount, 'PENDING');
    }

    static createFailed(payrollDisbursementId, amount) {
        return this.create(payrollDisbursementId, amount, 'FAILED');
    }
}

module.exports = XenditDisbursementFactory; 