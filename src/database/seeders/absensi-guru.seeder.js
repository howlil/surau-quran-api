const { logger } = require('../../lib/config/logger.config');
const absensiGuruFactory = require('../factories/absensi-guru.factory');
const { faker } = require('@faker-js/faker');

class AbsensiGuruSeeder {
  static async seed({ kelasPrograms }) {
    try {
      logger.info('Seeding absensi guru...');
      
      // Validate input array
      if (!kelasPrograms || !kelasPrograms.length) {
        logger.error('No kelasPrograms provided for AbsensiGuruSeeder');
        throw new Error('No kelasPrograms provided for AbsensiGuruSeeder');
      }
      
      logger.info(`Input data: ${kelasPrograms.length} kelas programs`);
      
      const absensiGurus = [];
      
      // For each kelas program, create 4-8 attendance records over the past weeks
      for (const kelasProgram of kelasPrograms) {
        const numRecords = faker.number.int({ min: 4, max: 8 });
        
        // Generate past dates that match the day of the week for this kelas program
        const pastDates = generatePastDatesForDay(kelasProgram.hari, numRecords);
        
        // Create attendance records for each date
        for (const date of pastDates) {
          // Determine the time based on the jamMengajar schedule
          const jamMasuk = faker.helpers.arrayElement(['10:00', '13:00', '15:00', '16:45', '19:00']);
          let jamKeluar;
          
          switch(jamMasuk) {
            case '10:00': jamKeluar = '11:45'; break;
            case '13:00': jamKeluar = '14:45'; break;
            case '15:00': jamKeluar = '16:45'; break;
            case '16:45': jamKeluar = '18:30'; break;
            case '19:00': jamKeluar = '20:45'; break;
            default: jamKeluar = '20:00';
          }
          
          // Calculate SKS
          const startHour = parseInt(jamMasuk.split(':')[0]);
          const startMin = parseInt(jamMasuk.split(':')[1]);
          const endHour = parseInt(jamKeluar.split(':')[0]);
          const endMin = parseInt(jamKeluar.split(':')[1]);
          
          const durationInMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
          const sks = Math.round(durationInMinutes / 45);
          
          // Custom weighted status assignment (80% HADIR, 10% TIDAK_HADIR, 5% each for the others)
          let statusKehadiran;
          const statusRoll = faker.number.int({ min: 1, max: 20 });
          if (statusRoll <= 16) {
            statusKehadiran = 'HADIR';
          } else if (statusRoll <= 18) {
            statusKehadiran = 'TIDAK_HADIR';
          } else if (statusRoll === 19) {
            statusKehadiran = 'IZIN';
          } else {
            statusKehadiran = 'SAKIT';
          }
          
          try {
            const absensiGuru = await absensiGuruFactory.with({
              kelasProgramId: kelasProgram.id,
              payrollId: null, // Will be set in the PayrollSeeder
              tanggal: date,
              jamMasuk,
              jamKeluar,
              sks,
              suratIzin: statusKehadiran === 'IZIN' || statusKehadiran === 'SAKIT' 
                ? `https://example.com/surat-izin-${faker.string.uuid()}.pdf` 
                : null,
              statusKehadiran
            }).createOne();
            
            absensiGurus.push(absensiGuru);
          } catch (error) {
            logger.error(`Failed to create absensi guru: ${error.message}`);
            // Continue with the next one
          }
        }
      }
      
      logger.info(`Created ${absensiGurus.length} absensi guru records`);
      
      return absensiGurus;
    } catch (error) {
      logger.error('Error seeding absensi guru:', error);
      throw error;
    }
  }
}

// Helper function to generate past dates for a specific day of the week
function generatePastDatesForDay(day, count) {
  const dayMap = {
    'SENIN': 1, 'SELASA': 2, 'RABU': 3, 'KAMIS': 4, 'JUMAT': 5, 'SABTU': 6, 'MINGGU': 0
  };
  
  const dayNumber = dayMap[day];
  const dates = [];
  let currentDate = new Date();
  
  while (dates.length < count) {
    if (currentDate.getDay() === dayNumber) {
      dates.push(currentDate.toISOString().split('T')[0]);
    }
    
    // Move back one day
    currentDate.setDate(currentDate.getDate() - 7);
  }
  
  return dates;
}

module.exports = AbsensiGuruSeeder;
