const { faker } = require('@faker-js/faker');

class TestimoniFactory {
    static async create(customData = {}) {
        const defaultData = {
            nama: faker.person.fullName(),
            posisi: faker.person.jobTitle(),
            isi: faker.lorem.paragraphs(2, '\n\n'),
            fotoUrl: faker.image.avatar()
        };

        return {
            ...defaultData,
            ...customData
        };
    }

    static async createMany(count = 5, customData = {}) {
        const items = [];

        for (let i = 0; i < count; i++) {
            const item = await this.create(customData);
            items.push(item);
        }

        return items;
    }
}

module.exports = TestimoniFactory; 