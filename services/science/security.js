const crypto = require('crypto');

const accountScheme = require("../../database/account");
const blacklistScheme = require("../../database/blacklist");

const services = {
  'device_block': async (Array) => {
    if (!Array) return;
    if (typeof(Array) !== 'object') return;
    
    const hash = crypto.createHash('sha256').update(JSON.stringify(Array)).digest('hex');
    const createScheme = new blacklistScheme({ DevicesHash: hash });
    createScheme.save();
  },
  'account_block': async (Token) => {
    if (!Token) return;
    if (typeof(Token) !== 'string') return;
    
    const getAccountID = Token.split(':')[0];
    const getAccount = await accountScheme.findOne({ ID: getAccountID });
    if (!getAccount) return;

    const getAllSessions = getAccount.Devices.AllDevices;
    const foundSession = getAllSessions.find(i => i.Token === Token);
    if (!foundSession) return;
    
    await accountScheme.findOneAndUpdate({ ID: getAccount.ID }, { 'Status.isBlocked': true });
  }
}

exports.load = async (RequestData, Req, Res) => {
  const body = Req.body;
  
  if (!body.service) return Res.send({ status: 400 });
  if (typeof(body.service) !== 'object') return Res.send({ status: 400 });
  Res.send({ status: 200 });
  
  const allServices = Object.keys(services);
  for (const service of body.service) {
    const getService = services[service];
    if (getService) {
      const getServiceContent = body[service] || false;
      if (getService) {
       getService(getServiceContent); 
      }
    }
  };
}