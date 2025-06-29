class PayrollBatchDisbursementFactory {
    static create(payrollIds, totalAmount) {
        const batchId = `batch_${Math.random().toString(36).substring(7)}_${Date.now().toString().substring(7)}`;
        const reference = `payroll-batch-${Date.now()}`;

        // Status batch disbursement yang mungkin
        const statuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
        const statusWeights = [0.1, 0.2, 0.6, 0.1]; // 60% completed, 20% processing, 10% pending, 10% failed

        let statusIndex = 0;
        const randomVal = Math.random();
        let cumulativeWeight = 0;

        for (let i = 0; i < statusWeights.length; i++) {
            cumulativeWeight += statusWeights[i];
            if (randomVal <= cumulativeWeight) {
                statusIndex = i;
                break;
            }
        }

        const status = statuses[statusIndex];
        const totalCount = payrollIds.length;

        return {
            xenditBatchId: batchId,
            reference,
            status,
            totalAmount,
            totalCount,
            payrollIds: JSON.stringify(payrollIds) // Convert to JSON string as per schema
        };
    }

    static createCompleted(payrollIds, totalAmount) {
        const batchId = `batch_${Math.random().toString(36).substring(7)}_${Date.now().toString().substring(7)}`;
        const reference = `payroll-batch-${Date.now()}`;

        return {
            xenditBatchId: batchId,
            reference,
            status: 'COMPLETED',
            totalAmount,
            totalCount: payrollIds.length,
            payrollIds: JSON.stringify(payrollIds)
        };
    }

    static createPending(payrollIds, totalAmount) {
        const batchId = `batch_${Math.random().toString(36).substring(7)}_${Date.now().toString().substring(7)}`;
        const reference = `payroll-batch-${Date.now()}`;

        return {
            xenditBatchId: batchId,
            reference,
            status: 'PENDING',
            totalAmount,
            totalCount: payrollIds.length,
            payrollIds: JSON.stringify(payrollIds)
        };
    }

    static createFailed(payrollIds, totalAmount) {
        const batchId = `batch_${Math.random().toString(36).substring(7)}_${Date.now().toString().substring(7)}`;
        const reference = `payroll-batch-${Date.now()}`;

        return {
            xenditBatchId: batchId,
            reference,
            status: 'FAILED',
            totalAmount,
            totalCount: payrollIds.length,
            payrollIds: JSON.stringify(payrollIds)
        };
    }
}

module.exports = PayrollBatchDisbursementFactory; 