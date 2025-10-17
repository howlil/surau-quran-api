const app = require('./src/app');

try {
    app.startUp()
} catch (error) {
    throw new Error(error);
}