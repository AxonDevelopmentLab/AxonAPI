const validator = require('validator');
const crypto = require('crypto');
const accountScheme = require("../../database/account");
const EmailManager = require('../background/emailmanager.js')

//Functions
function hashPassword(password, saltInput = false) {
    let salt = crypto.randomBytes(16).toString('hex');
    if (saltInput) salt = saltInput;
  
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
    return { salt: salt, hash: hash };
}

const subservices = {
  'changename': async (DB, Args, HTTP) => {
    let NEW_USERNAME = Args[0];
    const PASSWORD = Args[1];
    const CONFIRM_PASSWORD = Args[2];
    
    NEW_USERNAME = validator.escape(NEW_USERNAME);
    
    if (DB.Username.Current === NEW_USERNAME) return HTTP.send({ status: 403, message: 'Você já está utilizando esse nome de usuário.' })
    
    if (!validator.isLength(NEW_USERNAME, { min: 4, max: 16 })) return HTTP.send({ status: 403, message: 'O nome de usuário deve conter entre 4 e 16 caracteres.' });
    if (!validator.matches(NEW_USERNAME, /^[a-zA-Z0-9]+$/)) return HTTP.send({ status: 403, message: 'O nome de usuário não pode conter caracteres inválidos.' })

    if (PASSWORD.length < 8 || PASSWORD.length > 32) return HTTP.send({ status: 403, message: 'Senha incorreta.' })
    if (PASSWORD !== CONFIRM_PASSWORD) return HTTP.send({ status: 403, message: 'As senhas não batem.' });
    
    const PasswordToCompare = hashPassword(PASSWORD, DB.Password.salt);
    if (DB.Password.hash !== PasswordToCompare.hash) return HTTP.send({ status: 403, message: 'Senha incorreta.' });
    
    const UsernameObject = DB.Username;
    UsernameObject.Previous.push(UsernameObject.Current);
    UsernameObject.Current = NEW_USERNAME;
    UsernameObject.LastChange = Math.round(Date.now() / 1000);
    
    await accountScheme.findOneAndUpdate({ ID: DB.ID }, { 'Username': UsernameObject });
    return HTTP.send({ status: 200, message: 'O seu nome de usuário foi alterado com sucesso.' })
  },
  'changepassword': async (DB, Args, HTTP) => {
    const NEW_PASSWORD = Args[0];
    const CONFIRM_NEW_PASSWORD = Args[1];
    const OLD_PASSWORD = Args[2];

    if (NEW_PASSWORD.length < 8 || NEW_PASSWORD.length > 32) return HTTP.send({ status: 403, message: 'A nova senha deve conter entre 8 e 32 caracteres.' })
    if (CONFIRM_NEW_PASSWORD !== NEW_PASSWORD) return HTTP.send({ status: 403, message: 'As senhas não batem.' });
    if (OLD_PASSWORD.length < 8 || OLD_PASSWORD.length > 32) return HTTP.send({ status: 403, message: 'Senha incorreta.' });
    
    const PasswordToCompare = hashPassword(OLD_PASSWORD, DB.Password.salt);
    if (DB.Password.hash !== PasswordToCompare.hash) return HTTP.send({ status: 403, message: 'Senha incorreta.' })
    
    const GenerateHashForNewPassword = hashPassword(NEW_PASSWORD);
    if (hashPassword(NEW_PASSWORD, DB.Password.salt).hash === DB.Password.hash) return HTTP.send({ status: 403, message: 'Você já está utilizando essa senha.' })
    
    let DisconnectAllDevices = DB.Devices;
    DisconnectAllDevices.AllDevices = [];
    
    await accountScheme.findOneAndUpdate({ ID: DB.ID }, {
        $set: {
          'Password': {
            salt: GenerateHashForNewPassword.salt,
            hash: GenerateHashForNewPassword.hash
          },
          'Devices': DisconnectAllDevices
        }
    });
    
    return HTTP.send({ status: 200, redirect: `https://axonhub.glitch.me/account?message=${encodeURIComponent('Você foi desconectado da sua conta.<br>Faça o login novamente.')}&changetype=true`, message: 'A sua senha foi alterada com sucesso.' })
  },
  'changeemail': async (DB, Args, HTTP) => {
    let NEW_EMAIL = Args[0];
    const PASSWORD = Args[1];
    const CONFIRM_PASSWORD = Args[2];
    
    NEW_EMAIL = validator.escape(NEW_EMAIL);
    
    if (NEW_EMAIL === DB.Email.Current) return HTTP.send({ status: 403, message: 'Você já está utilizando esse email.' })
    if (!validator.isEmail(NEW_EMAIL)) return HTTP.send({ status: 403, message: 'Email inválido.' })
    const acceptedProvetors = ['gmail.com', 'protonmail.com', 'proton.me', 'pm.me', "outlook.com", "hotmail.com", "icloud.com", "live.com"];
    if (!acceptedProvetors.includes(NEW_EMAIL.split('@')[1])) return HTTP.send({ status: 403, message: 'Email inválido.' })
    
    if (PASSWORD.length < 8 || PASSWORD.length > 32) return HTTP.send({ status: 403, message: 'Senha incorreta.' })
    if (PASSWORD !== CONFIRM_PASSWORD) return HTTP.send({ status: 403, message: 'As senhas não batem.' })
    
    const PasswordToCompare = hashPassword(PASSWORD, DB.Password.salt);
    if (DB.Password.hash !== PasswordToCompare.hash) return HTTP.send({ status: 403, message: 'Senha incorreta.' })
    
    const findAccountByEmail = await accountScheme.findOne({ 'Email.Current': NEW_EMAIL });
    if (findAccountByEmail) return HTTP.send({ status: 403, message: 'Esse email já está em uso.' })
    
    const generateVerificationToken = crypto.randomBytes(16).toString('hex');
    let DisconnectAllDevices = DB.Devices;
    DisconnectAllDevices.AllDevices = [];
    
    let EmailObject = DB.Email;
    EmailObject.Previous.push(EmailObject.Current);
    EmailObject.Current = NEW_EMAIL;
    EmailObject.LastChange = Math.round(Date.now() / 1000);
    EmailObject.Verified = {
      Status: false,
      VerificationToken: generateVerificationToken
    };
    
    await accountScheme.findOneAndUpdate({ ID: DB.ID }, {
        $set: {
          'Email': EmailObject,
          'Devices': DisconnectAllDevices
        }
    });
    
    EmailManager.sendVerificationEmail(DB, DB.ID, generateVerificationToken, HTTP);
    return HTTP.send({ status: 200, redirect: `https://axonhub.glitch.me/account?message=${encodeURIComponent('Você foi desconectado da sua conta.<br>Faça o login novamente.')}&changetype=true`, message: 'O seu e-mail foi alterado com sucesso.' })
  },
  'accountdelete': async (DB, Args, HTTP) => {
    const PASSWORD = Args[0];
    const CONFIRM_PASSWORD = Args[1];
    let CONFIRMATION_PHRASE = Args[2];
    
    CONFIRMATION_PHRASE = validator.escape(CONFIRMATION_PHRASE);
    
    if (PASSWORD.length < 8 || PASSWORD.length > 32) return HTTP.send({ status: 403, message: 'Senha incorreta.' });
    if (PASSWORD !== CONFIRM_PASSWORD) return HTTP.send({ status: 403, message: 'As senhas não batem.' })
    
    const PasswordToCompare = hashPassword(PASSWORD, DB.Password.salt);
    if (DB.Password.hash !== PasswordToCompare.hash) return HTTP.send({ status: 403, message: 'Senha incorreta.' })
    
    if (CONFIRMATION_PHRASE !== "deletar") return HTTP.send({ status: 403, message: 'Frase de segurança incorreta.' })
    
    await accountScheme.findOneAndUpdate({ ID: DB.ID }, { 'Status.toDelete': Math.round(Date.now() / 1000) + (60 * 60 * 24 * 7) });
    return HTTP.send({ status: 200, redirect: `https://axonhub.glitch.me/account?message=${encodeURIComponent('Você foi desconectado da sua conta.<br>A sua conta entrou pra fila para ser deletada.')}&changetype=true`, message: 'A sua conta entrou na fila para ser deletada com sucesso.' })
  },
}

exports.load = async (RequestData, Req, Res) => {
  const BODY = Req.body;
  const ARGS = BODY.args;
  
  const getAccountID = BODY.token.split(':')[0];
  const getAccount = await accountScheme.findOne({ ID: getAccountID });
  if (!getAccount) return Res.send({ status: 401 })
  
  const getAllSessions = getAccount.Devices.AllDevices;
  const foundSession = getAllSessions.find(i => i.Token === BODY.token);
  if (!foundSession) return Res.send({ status: 401 });
  
  const allSubservices = Object.keys(subservices);
  if (!allSubservices.includes(BODY.service)) return Res.send({ status: 401 });
  return subservices[BODY.service](getAccount, ARGS, Res);
}