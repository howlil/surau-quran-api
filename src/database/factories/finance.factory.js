const { faker } = require('@faker-js/faker');

class FinanceFactory {
    static create(customData = {}) {
        // Define categories based on type
        const incomeCategories = ['SPP', 'ENROLLMENT', 'DONATION', 'OTHER_INCOME'];
        const expenseCategories = ['PAYROLL_SALARY', 'OPERATIONAL', 'UTILITIES', 'MAINTENANCE', 'MARKETING', 'SUPPLIES', 'OTHER_EXPENSE'];

        // Weighted selection for types (60% income, 40% expense - realistic for educational institution)
        const type = Math.random() < 0.6 ? 'INCOME' : 'EXPENSE';

        let category;
        let total;
        let deskripsi;

        if (type === 'INCOME') {
            category = faker.helpers.arrayElement(incomeCategories);

            // Generate amounts based on category
            switch (category) {
                case 'SPP':
                    total = faker.number.int({ min: 200000, max: 500000 }); // Monthly SPP
                    deskripsi = `Pembayaran SPP ${faker.person.firstName()}`;
                    break;
                case 'ENROLLMENT':
                    total = faker.number.int({ min: 100000, max: 300000 }); // Registration fee
                    deskripsi = `Biaya pendaftaran ${faker.person.firstName()}`;
                    break;
                case 'DONATION':
                    total = faker.number.int({ min: 50000, max: 1000000 }); // Donations
                    deskripsi = `Donasi dari ${faker.person.fullName()}`;
                    break;
                default:
                    total = faker.number.int({ min: 50000, max: 500000 });
                    deskripsi = `Pemasukan lain-lain - ${faker.lorem.words(3)}`;
            }
        } else {
            category = faker.helpers.arrayElement(expenseCategories);

            // Generate amounts based on category
            switch (category) {
                case 'PAYROLL_SALARY':
                    total = faker.number.int({ min: 1000000, max: 5000000 }); // Teacher salaries
                    deskripsi = `Gaji ${faker.person.jobTitle()} - ${faker.date.month()}`;
                    break;
                case 'OPERATIONAL':
                    total = faker.number.int({ min: 100000, max: 1000000 }); // Operational costs
                    deskripsi = `Biaya operasional - ${faker.lorem.words(2)}`;
                    break;
                case 'UTILITIES':
                    total = faker.number.int({ min: 200000, max: 800000 }); // Utilities
                    deskripsi = `${faker.helpers.arrayElement(['Listrik', 'Air', 'Internet', 'Telepon'])} bulan ${faker.date.month()}`;
                    break;
                case 'MAINTENANCE':
                    total = faker.number.int({ min: 100000, max: 2000000 }); // Maintenance
                    deskripsi = `Perawatan ${faker.helpers.arrayElement(['AC', 'Proyektor', 'Komputer', 'Gedung', 'Kendaraan'])}`;
                    break;
                case 'MARKETING':
                    total = faker.number.int({ min: 50000, max: 500000 }); // Marketing
                    deskripsi = `Promosi ${faker.helpers.arrayElement(['Media Sosial', 'Brosur', 'Banner', 'Website'])}`;
                    break;
                case 'SUPPLIES':
                    total = faker.number.int({ min: 50000, max: 300000 }); // Supplies
                    deskripsi = `Pembelian ${faker.helpers.arrayElement(['Al-Quran', 'ATK', 'Whiteboard', 'Spidol', 'Kertas'])}`;
                    break;
                default:
                    total = faker.number.int({ min: 50000, max: 500000 });
                    deskripsi = `Pengeluaran lain-lain - ${faker.lorem.words(3)}`;
            }
        }

        // Generate date in the last 6 months
        const currentDate = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
        const randomDate = new Date(sixMonthsAgo.getTime() + Math.random() * (currentDate.getTime() - sixMonthsAgo.getTime()));

        // Format tanggal sebagai DD-MM-YYYY sesuai format yang digunakan
        const day = randomDate.getDate().toString().padStart(2, '0');
        const month = (randomDate.getMonth() + 1).toString().padStart(2, '0');
        const year = randomDate.getFullYear();
        const tanggal = `${day}-${month}-${year}`;

        // 30% chance to have evidence file
        const evidence = Math.random() < 0.3 ? `evidence_${faker.string.alphanumeric(8)}.${faker.helpers.arrayElement(['pdf', 'jpg', 'png'])}` : null;

        const defaultData = {
            tanggal,
            deskripsi,
            type,
            category,
            total,
            evidence
        };

        return {
            ...defaultData,
            ...customData
        };
    }

    static createIncome(customData = {}) {
        return this.create({ ...customData, type: 'INCOME' });
    }

    static createExpense(customData = {}) {
        return this.create({ ...customData, type: 'EXPENSE' });
    }

    static createMany(count = 5, customData = {}) {
        const items = [];
        for (let i = 0; i < count; i++) {
            items.push(this.create(customData));
        }
        return items;
    }

    static createSppIncome(siswaName, amount) {
        return this.create({
            type: 'INCOME',
            category: 'SPP',
            total: amount,
            deskripsi: `Pembayaran SPP ${siswaName}`
        });
    }

    static createPayrollExpense(guruName, amount) {
        return this.create({
            type: 'EXPENSE',
            category: 'PAYROLL_SALARY',
            total: amount,
            deskripsi: `Gaji ${guruName}`
        });
    }

    static createEnrollmentIncome(siswaName, amount) {
        return this.create({
            type: 'INCOME',
            category: 'ENROLLMENT',
            total: amount,
            deskripsi: `Biaya pendaftaran ${siswaName}`
        });
    }
}

module.exports = FinanceFactory; 