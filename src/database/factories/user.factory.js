const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');


class UserFactory {
    static async createAdmin() {
        const hashedPassword = await bcrypt.hash('@Test123', 10);
        return {
            id: uuidv4(),
            email: 'example@admin.com',
            password: hashedPassword,
            role: 'ADMIN'
        };
    }

    static async createGuru() {
        const hashedPassword = await bcrypt.hash('@Test123', 10);
        return {
            id: uuidv4(),
            email: 'example@guru.com',
            password: hashedPassword,
            role: 'GURU'
        };
    }

    static async createSiswa() {
        const hashedPassword = await bcrypt.hash('@Test123', 10);
        return {
            id: uuidv4(),
            email: 'example@siswa.com',
            password: hashedPassword,
            role: 'SISWA'
        };
    }

    static async createRandomUser(role) {
        const hashedPassword = await bcrypt.hash('@Test123', 10);
        return {
            id: uuidv4(),
            email: `${role.toLowerCase()}_${Math.random().toString(36).substring(7)}@example.com`,
            password: hashedPassword,
            role
        };
    }
}

module.exports = UserFactory; 