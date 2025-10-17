const SppReminderCronService = require('../service/spp-reminder-cron.service');
const Http = require('../../lib/http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class SppReminderController {
    sendSppReminders = ErrorHandler.asyncHandler(async (req, res) => {
        const result = await SppReminderCronService.sendSppReminders();
        return Http.Response.success(res, result, 'SPP reminder process completed');
    });

}

module.exports = new SppReminderController(); 