const mongoose = require('mongoose');
const scheme = new mongoose.Schema({
    v: String,
    ID: String,
    Picks: Number,
    Statistics: Object
});

module.exports = mongoose.model('instalockapp', scheme);