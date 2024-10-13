const mongoose = require('mongoose');
const scheme = new mongoose.Schema({
  ServiceName: String,
  MainKey: String,
  FileIVs: Array,
  AppHash: String,
  AccessLimited: Array
});

module.exports = mongoose.model('service.access', scheme);