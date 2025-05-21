class AdminFactory {
    static create() {
        return {
            nama: `Admin ${Math.random().toString(36).substring(7)}`
        };
    }
}

module.exports = AdminFactory; 