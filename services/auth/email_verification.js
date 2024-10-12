//APIs
const validator = require('validator');
const crypto = require('crypto');

//Schemes
const accountScheme = require("../../database/account");
const accountManagerCreator = require('../accountmanager/creator.js');

exports.load = async (IP, Req, Res) => {
  const INVALID_ACCOUNT_URL = `https://axonhub.glitch.me/account?message=${encodeURIComponent('Esse link de validação está expirado.<br>Crie novamente a conta.')}`;
  const SUCESSFULLY_VALIDATION = `https://axonhub.glitch.me/account?message=${encodeURIComponent('A sua conta foi verificada com sucesso!<br>Realize o login.')}&changetype=true`;
  
  try {
    const ID = Req.query.id;
    const TOKEN = Req.query.token;
    
    const getAccount = await accountScheme.findOne({ ID: ID });
    if (!getAccount) return Res.send(`<body onload="location.href='${INVALID_ACCOUNT_URL}'"></body>`);

    await accountScheme.findOneAndUpdate({ ID: getAccount.ID }, { 'Email.Verified': { Status: true, VerificationToken: '' }});
    accountManagerCreator.load(getAccount.ID);
    return Res.send(`<body onload="location.href='${SUCESSFULLY_VALIDATION}'"></body>`)
  } catch (err) {
    return Res.send(`<body onload="location.href='${INVALID_ACCOUNT_URL}'"></body>`)
  }
}