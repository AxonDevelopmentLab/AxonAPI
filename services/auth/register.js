//APIs
const validator = require('validator');
const crypto = require('crypto');
const EmailManager = require('../background/emailmanager.js')

//Schemes
const accountScheme = require("../../database/account");

//Funções
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
    return { salt: salt, hash: hash };
}

exports.load = async (IP, Req, Res) => {
  const BODY = Req.body;
  
  const requiredFields = ['username', 'email', 'password', 'confirm_password'];
  for (const field of requiredFields) if (!BODY[field] || typeof BODY[field] !== 'string') return Res.send({ status: 400, message: 'Todos os campos são obrigatórios.' });
  
  BODY.username = validator.escape(BODY.username);
  BODY.email = validator.escape(BODY.email);
  
  if (!validator.isEmail(BODY.email)) return Res.send({ status: 400, message: 'Email inválido.' });
  const acceptedProvetors = ['gmail.com', 'protonmail.com', 'proton.me', 'pm.me', "outlook.com", "hotmail.com", "icloud.com", "live.com"];
  if (!acceptedProvetors.includes(BODY.email.split('@')[1])) return Res.send({ status: 400, message: 'Provedor de email não aceito.' });
  
  if (!validator.isLength(BODY.username, { min: 4, max: 16 })) return Res.send({ status: 400, message: 'Nome de usuário com tamanho inválido.' });
  if (!validator.matches(BODY.username, /^[a-zA-Z0-9]+$/)) return Res.send({ status: 400, message: 'Nome de usuário com carácteres inválidos.'});
  
  if (BODY.password.length < 8 || BODY.password.length > 32) return Res.send({ status: 400, message: 'A senha deve ter entre 8 e 32 carácteres.' });
  if (BODY.password !== BODY.confirm_password) return Res.send({ status: 400, message: 'As senhas não batem.' }); 
  
  const getAlternativeAccount = await accountScheme.findOne({ 'Devices.CreatorIP': IP });
  //if (getAlternativeAccount) return Res.send({ status: 400, message: 'Você não pode ter duas contas.' });
  
  const getAccountByEmail = await accountScheme.findOne({ 'Email.Current': BODY.email });
  if (getAccountByEmail) return Res.send({ status: 400, message: 'Já existe uma conta com esse email.' });
  
  const AccountID = crypto.randomBytes(8).toString('hex');
  const EmailVerificationToken = crypto.randomBytes(16).toString('hex');
  const AcessToken = AccountID + ':' + crypto.randomBytes(8).toString('hex');
  
  const createAccount = new accountScheme({
    ID: AccountID,
    CreatedAt: Math.round(Date.now() / 1000),
    Username: {
      Current: BODY.username,
      LastChange: Math.round(Date.now() / 1000),
      Previous: [],
    },
    Email: {
      Current: BODY.email,
      Verified: {
        Status: false,
        VerificationToken: EmailVerificationToken
      },
      LastChange: Math.round(Date.now() / 1000),
      Previous: [],
    },
    Password: hashPassword(BODY.password),
    Devices: {
      CreatorIP: IP,
      AllDevices: []
    },
    Plan: {
      Current: 'free',
      ExpiresIn: 0
    },
    Status: {
      isBlocked: false,
      RateLimit: 0,
      toDelete: 0
    },
    Connections: {}
  });
  
  EmailManager.sendVerificationEmail({ Username: { Current: BODY.username }, Email: { Current: BODY.email }}, AccountID, EmailVerificationToken, Res);
  
  createAccount.save();
  return Res.send({ status: 400, message: 'Foi enviado um e-mail para validar a sua conta.' })
}