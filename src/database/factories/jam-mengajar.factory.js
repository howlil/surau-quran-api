class JamMengajarFactory {
    static create(index) {
        // Pre-defined time slots that make sense for teaching
        const timeSlots = [
            { jamMulai: '10:00', jamSelesai: '11:30' },
            { jamMulai: '13:00', jamSelesai: '14:30' },
            { jamMulai: '14:30', jamSelesai: '16:00' },
            { jamMulai: '16:00', jamSelesai: '17:30' },
            { jamMulai: '19:00', jamSelesai: '20:30' }
        ];

        if (index < timeSlots.length) {
            return timeSlots[index];
        }

        // If we need more than the pre-defined slots, generate random ones
        const startHour = Math.floor(Math.random() * 12) + 8; // 8 AM to 8 PM
        const startMinute = Math.random() > 0.5 ? 0 : 30;
        const durationHours = Math.floor(Math.random() * 2) + 1; // 1 to 2.5 hours
        const durationMinutes = Math.random() > 0.5 ? 0 : 30;

        const endHour = startHour + durationHours;
        const endMinute = (startMinute + durationMinutes) % 60;
        const hourCarry = (startMinute + durationMinutes) >= 60 ? 1 : 0;

        return {
            jamMulai: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
            jamSelesai: `${String(endHour + hourCarry).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`
        };
    }
}

module.exports = JamMengajarFactory; 