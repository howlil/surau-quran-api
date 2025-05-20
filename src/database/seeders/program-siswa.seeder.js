const { logger } = require('../../lib/config/logger.config');
const programSiswaFactory = require('../factories/program-siswa.factory');
const { faker } = require('@faker-js/faker');

class ProgramSiswaSeeder {
  static async seed({ siswas, programs }) {
    try {
      logger.info('Seeding program siswa...');
      
      // Validate input arrays
      if (!siswas || !siswas.length) {
      logger.error('No siswas provided for ProgramSiswaSeeder');
        throw new Error('No siswas provided for ProgramSiswaSeeder');
      }
      
      if (!programs || !programs.length) {
        logger.error('No programs provided for ProgramSiswaSeeder');
        throw new Error('No programs provided for ProgramSiswaSeeder');
      }
      
      logger.info(`Input data: ${siswas.length} siswas, ${programs.length} programs`);
      
      const programSiswas = [];
      
      // Assign 1-3 programs to each student
      for (const siswa of siswas) {
        // Determine how many programs this student will have
        const numPrograms = faker.number.int({ min: 1, max: 3 });
        
        // Randomly select programs for this student without duplication
        const selectedPrograms = faker.helpers.arrayElements(programs, numPrograms);
        
        // Create program-siswa records for each selected program
        for (const program of selectedPrograms) {
          // Custom weighted status assignment (80% AKTIF, 10% TIDAK_AKTIF, 10% CUTI)
          let status;
          const statusRoll = faker.number.int({ min: 1, max: 10 });
          if (statusRoll <= 8) {
            status = 'AKTIF';
          } else if (statusRoll === 9) {
            status = 'TIDAK_AKTIF';
          } else {
            status = 'CUTI';
          }
          
          try {
            const programSiswa = await programSiswaFactory.with({
              siswaId: siswa.id,
              programId: program.id,
              status
            }).createOne();
            
            programSiswas.push(programSiswa);
          } catch (error) {
            logger.error(`Failed to create program siswa: ${error.message}`);
            // Continue with the next one
          }
        }
      }
      
      logger.info(`Created ${programSiswas.length} program siswa records`);
      
      return programSiswas;
    } catch (error) {
      logger.error('Error seeding program siswa:', error);
      throw error;
    }
  }
}

module.exports = ProgramSiswaSeeder;