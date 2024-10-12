const mongoose = require('mongoose');
const scheme = new mongoose.Schema({
    ID: String,
    CreatedAt: Number,
    Username: Object,
    Email: Object,
    Password: Object,
    Devices: {
      CreatorIP: String,
      AllDevices: Array
    },
    Plan: {
      Current: String,
      ExpiresIn: Number
    },
    Status: {
      isBlocked: Boolean,
      RateLimit: Number,
      toDelete: Number
    },
    Connections: Object
});

module.exports = mongoose.model('accounts', scheme);