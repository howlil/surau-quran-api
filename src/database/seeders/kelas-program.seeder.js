const { logger } = require('../../lib/config/logger.config');
const kelasProgramFactory = require('../factories/kelas-program.factory');
const { faker } = require('@faker-js/faker');

class KelasProgramSeeder {
  static async seed({ kelases, programs, jamMengajars, gurus }) {
    try {
      logger.info('Seeding kelas programs...');
      
      // Validate input arrays
      if (!kelases || !kelases.length) {
        logger.error('No kelases provided for KelasProgramSeeder');
        throw new Error('No kelases provided for KelasProgramSeeder');
      }
      
      if (!programs || !programs.length) {
        logger.error('No programs provided for KelasProgramSeeder');
        throw new Error('No programs provided for KelasProgramSeeder');
      }
      
      if (!jamMengajars || !jamMengajars.length) {
        logger.error('No jamMengajars provided for KelasProgramSeeder');
        throw new Error('No jamMengajars provided for KelasProgramSeeder');
      }
      
      if (!gurus || !gurus.length) {
        logger.error('No gurus provided for KelasProgramSeeder');
        throw new Error('No gurus provided for KelasProgramSeeder');
      }
      
      logger.info(`Input data: ${kelases.length} kelases, ${programs.length} programs, ${jamMengajars.length} jam mengajars, ${gurus.length} gurus`);
      
      const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
      const kelasPrograms = [];
      
      // Create kelas-program combinations
      // Each program will have multiple class schedules
      for (const program of programs) {
        // Create 2-4 kelas programs for each actual program
        const numClasses = faker.number.int({ min: 2, max: 4 });
        
        for (let i = 0; i < numClasses; i++) {
          // Select a random kelas, jam mengajar, and guru
          const kelas = faker.helpers.arrayElement(kelases);
          const jamMengajar = faker.helpers.arrayElement(jamMengajars);
          const guru = faker.helpers.arrayElement(gurus);
          const hari = faker.helpers.arrayElement(days);
          const tipeKelas = program.namaProgram === 'Private' ? 'Private' : 'Grup';
          
          try {
            const kelasProgram = await kelasProgramFactory.with({
              kelasId: kelas.id,
              programId: program.id,
              jamMengajarId: jamMengajar.id,
              guruId: guru.id,
              hari,
              tipeKelas
            }).createOne();
            
            kelasPrograms.push(kelasProgram);
          } catch (error) {
            logger.error(`Failed to create kelas program: ${error.message}`);
            // Continue with the next one
          }
        }
      }
      
      logger.info(`Created ${kelasPrograms.length} kelas program records`);
      
      return kelasPrograms;
    } catch (error) {
      logger.error('Error seeding kelas programs:', error);
      throw error;
    }
  }
}

module.exports = KelasProgramSeeder;