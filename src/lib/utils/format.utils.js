class FormatUtils {

    static formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }
    static formatCUrrency(amount) {
        if (amount === null || amount === undefined) return '';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(amount);
    }

    static formatTime(time) {
        if (!time) return '';
        const t = new Date(`1970-01-01T${time}`);
        return t.toTimeString().split(' ')[0];
    }
}