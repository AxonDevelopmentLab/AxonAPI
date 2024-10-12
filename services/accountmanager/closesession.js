const accountScheme = require("../../database/account");

exports.load = async (IP, Req, Res) => {
  const BODY = Req.body;
  
  const getAccountID = BODY.token.split(':')[0];
  const getAccount = await accountScheme.findOne({ ID: getAccountID });
  if (!getAccount) return Res.send({ status: 400 })
  
  const getAllSessions = getAccount.Devices.AllDevices;
  const foundSession = getAllSessions.find(i => i.Token === BODY.token);
  if (!foundSession) return Res.send({ status: 400 });
  
  if (!BODY.session_id) return Res.send({ status: 400 });
  const foundSessionToClose = getAllSessions.find(i => i.SessionID === BODY.session_id);
  if (!foundSessionToClose) return Res.send({ status: 400 });
  
  const removeSession = getAllSessions.filter(DB => DB.SessionID !== BODY.session_id);
  await accountScheme.findOneAndUpdate({ ID: getAccount.ID }, { 'Devices.AllDevices': removeSession });

  return Res.send({ status: 200 })
}