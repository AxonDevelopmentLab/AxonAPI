//APIs
const UAParser = require('ua-parser-js');
const validator = require('validator');
const crypto = require('crypto');
const axios = require('axios');

//Schemes
const accountScheme = require("../../database/account");

//Functions
function hashPassword(password, saltInput) {
    const salt = saltInput;
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
    return hash;
}

exports.load = async (IP, Req, Res) => {
  const BODY = Req.body;
  
  const requiredFields = ['email', 'password'];
  for (const field of requiredFields) if (!BODY[field] || typeof BODY[field] !== 'string') return Res.send({ status: 400, message: 'Todos os campos são obrigatórios.' });
  
  BODY.email = validator.escape(BODY.email);
  if (!validator.isEmail(BODY.email)) return Res.send({ status: 400, message: 'Credenciais inválidas.' });
  
  const getAccountByEmail = await accountScheme.findOne({ 'Email.Current': BODY.email });
  if (!getAccountByEmail) return Res.send({ status: 400, message: 'Não existe nenhuma conta com esse e-mail.' });
  if (getAccountByEmail.Email.Verified.Status === false) return Res.send({ status: 400, message: 'A sua conta não está verificada.<br>Acesse o seu e-mail para verificar-la.' });
  
  if (Number(getAccountByEmail.Status.RateLimit) === 4) {
    Res.send({ status: 400, message: 'Ocorreram muitas tentativas de login, tente novamente mais tarde.' });
    setTimeout(async () => {
      const getAccountStatusUpdated = await accountScheme.findOne({ ID: getAccountByEmail.ID });
      const getAlreadyTimesTriedUpdated = Number(getAccountStatusUpdated.Status.RateLimit);
      if (getAlreadyTimesTriedUpdated === 4) await accountScheme.findOneAndUpdate({ ID: getAccountByEmail.ID }, { 'Status.RateLimit': 0 });
    }, (1000 * 60 * 1));
    return;
  };
  
  const PasswordToCompare = hashPassword(BODY.password, getAccountByEmail.Password.salt);
  if (getAccountByEmail.Password.hash !== PasswordToCompare) {
    const getAlreadyTimesTried = Number(getAccountByEmail.Status.RateLimit);
    await accountScheme.findOneAndUpdate({ ID: getAccountByEmail.ID }, { 'Status.RateLimit': getAlreadyTimesTried + 1 });
    return Res.send({ status: 400, message: 'Credenciais inválidas.' })
  };
    
  if (Number(getAccountByEmail.Status.toDelete) !== 0) return Res.send({ status: 400, message: 'Esta conta está no prazo para ser deletada.<br>Entre em contato com suporte para reverter.' });
  if (getAccountByEmail.Status.isBlocked == true) return Res.send({ status: 400, message: 'A sua conta está bloqueada, entre em contato com o suporte.' });
  
  let DeviceName = '';
  try {
    const userAgent = Req.get('User-Agent');
    const parser = new UAParser();
    parser.setUA(userAgent);
    const result = parser.getResult();
      
    let first_input = true;
    if (result.browser.name !== undefined) {
      if (first_input === false) DeviceName += ', ';
      first_input = false;
      DeviceName += result.browser.name;
    }
      
    if (result.os.name !== undefined) {
      if (first_input === false) DeviceName += ', ';
      first_input = false;
      DeviceName += result.os.name;
    }
      
    if (result.device.name !== undefined) {
      if (first_input === false) DeviceName += ', ';
      first_input = false;
      DeviceName += result.device.name;
    };
      
    if (DeviceName === '') DeviceName = 'Unidentified.'
  } catch (error_x2) {
    DeviceName = 'Unnamed.'
  }
  
  const getCurrentDevices = getAccountByEmail.Devices.AllDevices
  let foundSession = getCurrentDevices.find(i => (i.IP === IP && i.Device === DeviceName));
  
  if (foundSession) {
    foundSession.lastTimeSeen = Math.round(Date.now() / 1000) - 20;
    await accountScheme.findOneAndUpdate({ ID: getAccountByEmail.ID }, { 'Devices.AllDevices': getCurrentDevices });
    
    return Res.send({ status: 200, auth_pass: foundSession.Token, account_id: getAccountByEmail.ID }) 
  } else {
    const SessionID = crypto.randomBytes(8).toString('hex');
    const AcessToken = getAccountByEmail.ID + ':' + crypto.randomBytes(8).toString('hex');
    
    let IPLocation = 'Unidentified.';
    
    try {
      const response = await axios.get(`https://ipinfo.io/${IP}/json`);
      IPLocation = `${response.data.country}, ${response.data.region}, ${response.data.city}`;
    } catch (error) {
      IPLocation = 'Unlocalizated.'
    }
    
    getCurrentDevices.push({ SessionID: SessionID, lastTimeSeen: (Math.round(Date.now() / 1000) - 20), IP: IP, Location: IPLocation, Device: DeviceName, Token: AcessToken })
    await accountScheme.findOneAndUpdate({ ID: getAccountByEmail.ID }, { 'Devices.AllDevices': getCurrentDevices });
    return Res.send({ status: 200, auth_pass: AcessToken, account_id: getAccountByEmail.ID }) 
  }
}