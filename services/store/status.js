const accountScheme = require("../../database/account");
const paymentsScheme = require("../../database/payments");

exports.load = async (IP, Req, Res) => {
  const BODY = Req.body;
  
  if (!BODY.processid) return Res.send({ status: 403, message: 'Acesso não permitido.' });
  
  const getAccountID = BODY.token.split(':')[0];
  const getAccount = await accountScheme.findOne({ ID: getAccountID });
  if (!getAccount) return Res.send({ status: 403, message: 'Acesso não permitido.' });
  
  const getAllSessions = getAccount.Devices.AllDevices;
  const foundSession = getAllSessions.find(i => i.Token === BODY.token);
  if (!foundSession) return Res.send({ status: 403, message: 'Acesso não permitido.' });
  
  const getPayment = await paymentsScheme.findOne({ ProcessID: BODY.processid });
  if (!getPayment) return Res.send({ status: 403 });
  if (getPayment.Approved === false) return Res.send({ status: 400 });
  
  Res.send({ status: 200, planname: getPayment.DisplayName });
  await paymentsScheme.findOneAndDelete({ ProcessID: BODY.processid });
}