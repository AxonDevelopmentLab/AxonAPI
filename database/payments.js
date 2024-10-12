const mongoose = require('mongoose');
const scheme = new mongoose.Schema({
  TransactionID: String,
  ProcessID: String,
  AccountID: String,
  CreatedDate: Number,
  Approved: Boolean,
  RawName: String,
  DisplayName: String,
  Duration: Number,
  Subtotal: Number,
  CupomCode: String
});

module.exports = mongoose.model('payments', scheme);