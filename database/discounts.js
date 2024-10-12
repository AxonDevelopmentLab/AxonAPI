const mongoose = require('mongoose');
const scheme = new mongoose.Schema({
  Code: String,
  Percentage: Number,
  TimesUsed: Number,
  MaxTimes: Number,
  isActive: Boolean
});

module.exports = mongoose.model('discounts', scheme);