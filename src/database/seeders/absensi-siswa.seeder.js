const { logger } = require('../../lib/config/logger.config');
const absensiSiswaFactory = require('../factories/absensi-siswa.factory');
const { faker } = require('@faker-js/faker');

class AbsensiSiswaSeeder {
  static async seed({ jadwalSiswas, kelasPrograms }) {
    try {
      logger.info('Seeding absensi siswa...');
      
      // Validate input arrays
      if (!jadwalSiswas || !jadwalSiswas.length) {
        logger.error('No jadwalSiswas provided for AbsensiSiswaSeeder');
        throw new Error('No jadwalSiswas provided for AbsensiSiswaSeeder');
      }
      
      if (!kelasPrograms || !kelasPrograms.length) {
        logger.error('No kelasPrograms provided for AbsensiSiswaSeeder');
        throw new Error('No kelasPrograms provided for AbsensiSiswaSeeder');
      }
      
      logger.info(`Input data: ${jadwalSiswas.length} jadwal siswas, ${kelasPrograms.length} kelas programs`);
      
      const absensiSiswas = [];
      
      // For each jadwal, create 4-8 attendance records over the past weeks
      for (const jadwalSiswa of jadwalSiswas) {
        const numRecords = faker.number.int({ min: 4, max: 8 });
        
        // Get the kelasProgram to access the day of the week
        const kelasProgram = kelasPrograms.find(kp => kp.id === jadwalSiswa.kelasProgramId);
        
        if (!kelasProgram) continue;
        
        // Generate past dates that match the day of the week for this kelas program
        const pastDates = generatePastDatesForDay(kelasProgram.hari, numRecords);
        
        // Create attendance records for each date
        for (const date of pastDates) {
          // Custom weighted status assignment (70% HADIR, 10% each for others)
          let statusKehadiran;
          const statusRoll = faker.number.int({ min: 1, max: 10 });
          if (statusRoll <= 7) {
            statusKehadiran = 'HADIR';
          } else if (statusRoll === 8) {
            statusKehadiran = 'TIDAK_HADIR';
          } else if (statusRoll === 9) {
            statusKehadiran = 'IZIN';
          } else {
            statusKehadiran = 'SAKIT';
          }
          
          try {
            const absensiSiswa = await absensiSiswaFactory.with({
              kelasProgramId: jadwalSiswa.kelasProgramId,
              tanggal: date,
              statusKehadiran
            }).createOne();
            
            absensiSiswas.push(absensiSiswa);
          } catch (error) {
            logger.error(`Failed to create absensi siswa: ${error.message}`);
            // Continue with the next one
          }
        }
      }
      
      logger.info(`Created ${absensiSiswas.length} absensi siswa records`);
      
      return absensiSiswas;
    } catch (error) {
      logger.error('Error seeding absensi siswa:', error);
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

module.exports = AbsensiSiswaSeeder;
