const mongoose = require('mongoose');
const scheme = new mongoose.Schema({
  DevicesHash: String
});

module.exports = mongoose.model('devices.blacklists', scheme);