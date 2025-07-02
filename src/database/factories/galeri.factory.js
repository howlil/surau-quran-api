const { faker } = require('@faker-js/faker');

class GaleriFactory {
    static async create(customData = {}) {
        const defaultData = {
            judulFoto: faker.lorem.words(3),
            coverGaleri: faker.image.url({ width: 640, height: 480 })
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

module.exports = GaleriFactory; 