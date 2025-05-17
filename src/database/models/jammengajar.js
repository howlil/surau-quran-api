'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class JamMengajar extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.hasMany(models.KelasProgram, {
        foreignKey: 'jam_id',
        as: 'kelas_program'
      });
    }
  }
  JamMengajar.init({
    id: DataTypes.UUID,
    jam_mulai: DataTypes.TIME,
    jam_selesai: DataTypes.TIME
  }, {
    sequelize,
    modelName: 'JamMengajar',
  });
  return JamMengajar;
};