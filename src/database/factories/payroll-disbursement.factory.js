class PayrollDisbursementFactory {
    static create(payrollId, amount) {
        // Random date in the last 30 days for processing
        const currentDate = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(currentDate.getDate() - 30);

        const randomDate = new Date(thirtyDaysAgo.getTime() + Math.random() * (currentDate.getTime() - thirtyDaysAgo.getTime()));
        const tanggalProses = randomDate.toISOString().split('T')[0];

        return {
            payrollId,
            amount,
            tanggalProses
        };
    }

    static createWithCurrentDate(payrollId, amount) {
        const currentDate = new Date();
        const tanggalProses = currentDate.toISOString().split('T')[0];

        return {
            payrollId,
            amount,
            tanggalProses
        };
    }

    static createWithSpecificDate(payrollId, amount, tanggalProses) {
        return {
            payrollId,
            amount,
            tanggalProses
        };
    }
}

module.exports = PayrollDisbursementFactory; 