const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./lib/http/error.handler.http');
const routes = require('./app/routes');
const CronJobs = require('./lib/config/cronjob.config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1', routes);

// Error Handler - MUST be last
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    // Initialize cron jobs after server starts
    CronJobs.init();
});

module.exports = app; 