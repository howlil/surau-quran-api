const bcrypt = require('bcrypt');


class UserFactory {
    static async createAdmin() {
        const hashedPassword = await bcrypt.hash('@Test123', 10);
        return {
            email: 'example@admin.com',
            password: hashedPassword,
            role: 'ADMIN'
        };
    }

    static async createGuru() {
        const hashedPassword = await bcrypt.hash('@Test123', 10);
        return {
            email: 'example@guru.com',
            password: hashedPassword,
            role: 'GURU'
        };
    }

    static async createSiswa() {
        const hashedPassword = await bcrypt.hash('@Test123', 10);
        return {
            email: 'example@siswa.com',
            password: hashedPassword,
            role: 'SISWA'
        };
    }

    static async createRandomUser(role) {
        const hashedPassword = await bcrypt.hash('@Test123', 10);
        return {
            email: `${role.toLowerCase()}_${Math.random().toString(36).substring(7)}@example.com`,
            password: hashedPassword,
            role
        };
    }
}

module.exports = UserFactory; 