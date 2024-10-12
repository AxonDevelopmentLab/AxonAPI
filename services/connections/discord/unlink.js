const axios = require('axios');

const accountScheme = require("../../../database/account");

exports.load = async (IP, Req, Res) => {
  const TOKEN = Req.body.token;
  const getAccountID = TOKEN.split(':')[0];
  const getAccount = await accountScheme.findOne({ ID: getAccountID });
  if (!getAccount) return Res.send({ status: 400 });
  
  const getAllSessions = getAccount.Devices.AllDevices;
  const foundSession = getAllSessions.find(i => i.Token === TOKEN);
  if (!foundSession) return Res.send({ status: 400 });
  
  if (getAccount.Connections && getAccount.Connections.Discord && getAccount.Connections.Discord.ID !== "") {    
    const getConnectionObject = getAccount.Connections.Discord;
    getConnectionObject.ID = "";
    getConnectionObject.Username = "";
    getConnectionObject.LastUpdate = 0;
    
    await accountScheme.findOneAndUpdate({ ID: getAccountID }, { 'Connections.Discord': getConnectionObject });

    return Res.send({ status: 200 });    
  } else {
    return Res.send({ status: 400 }); 
  }
}