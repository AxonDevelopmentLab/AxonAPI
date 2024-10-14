const accountScheme = require("../../database/account");
const securityValidator = require('../background/security_validator.js');
const servicesSys = require('./services.js');

const getServices = {
  "account": (MainAccount) => {
    let allDevices = MainAccount.Devices.AllDevices.forEach(Device => {
      delete Device.Token;
      delete Device.IP;
    });
    
    let discord_username = "";
    if (MainAccount.Connections && MainAccount.Connections.Discord) discord_username = MainAccount.Connections.Discord.Username;
    
    return {
      username: MainAccount.Username.Current,
      username_lastchange: MainAccount.Username.LastChange,
      email: MainAccount.Email.Current,
      email_lastchange: MainAccount.Email.LastChange,
      alldevices: MainAccount.Devices.AllDevices,
      current_plan: MainAccount.Plan.Current,
      current_plan_expires_in: MainAccount.Plan.ExpiresIn,
      discord_username: discord_username
    }
  },
  "stats.instalockapp": async (MainAccount, SObj) => {
    const ThreadDetected = securityValidator.InstalockAPP(SObj);
    if (ThreadDetected) return { status: 400 };
    
    await servicesSys.validateUpdateCreate(MainAccount.ID, 'instalockapp');
    const getServiceDB = await servicesSys.getService(MainAccount.ID, 'instalockapp');
    if (getServiceDB === false) return { status: 400 };

    let recreateStatistics = JSON.parse(JSON.stringify(getServiceDB));
    recreateStatistics.allowPicks = true;
    if (Number(getServiceDB.Picks) === 0 && MainAccount.Plan.Current === 'free') recreateStatistics.allowPicks = false
    
    return recreateStatistics;
  },
  "access.instalockapp": async (MainAccount, SObj) => {
    const ThreadDetected = securityValidator.InstalockAPP(SObj);
    if (ThreadDetected) return { status: 400 };

    await servicesSys.validateUpdateCreate(MainAccount.ID, 'instalockapp');
    const getServiceDB = await servicesSys.getService(MainAccount.ID, 'instalockapp');
    if (getServiceDB === false) return { status: 400 };
    
    const getAccess = await servicesSys.getAccess(MainAccount.ID, 'instalockapp');
    return getAccess;
  }
}

exports.load = async (IP, Req, Res) => {
  const BODY = Req.body;
  
  const getAccountID = BODY.token.split(':')[0];
  const getAccount = await accountScheme.findOne({ ID: getAccountID });
  if (!getAccount) return Res.send({ status: 400 })
  
  const getAllSessions = getAccount.Devices.AllDevices;
  const foundSession = getAllSessions.find(i => i.Token === BODY.token);
  if (!foundSession) return Res.send({ status: 400 });
  
  if (!BODY.services) return Res.send({ status: 400 });
  if (BODY.services.length < 0) return Res.send({ status: 400 });
  
  let SecurityObject = false;
  if (BODY.security) SecurityObject = BODY.security;
  
  if (Number(getAccount.Status.toDelete) !== 0) return Res.send({ status: 400 });
  if (getAccount.Status.isBlocked == true) return Res.send({ status: 400 });
  
  foundSession.lastTimeSeen = Math.round(Date.now() / 1000) - 20;
  await accountScheme.findOneAndUpdate({ ID: getAccount.ID }, { 'Devices.AllDevices': getAllSessions });
  
  let callback = {};
  const AllServices = Object.keys(getServices);
  for (const item of BODY.services) {
    if (!AllServices.includes(item)) {
      callback[item] = "non-existent service";
    } else {
     callback[item] = await getServices[item](getAccount, SecurityObject); 
    }
  };
  
  return Res.send({ status: 200, services: callback })
}