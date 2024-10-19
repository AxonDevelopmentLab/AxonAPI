const axios = require('axios');

const accountScheme = require("../../../database/account");

exports.load = async (RequestData, Req, Res) => {
  const TOKEN = Req.body.token;
  const getAccountID = TOKEN.split(':')[0];
  const getAccount = await accountScheme.findOne({ ID: getAccountID });
  if (!getAccount) return Res.send({ status: 401 });
  
  const getAllSessions = getAccount.Devices.AllDevices;
  const foundSession = getAllSessions.find(i => i.Token === TOKEN);
  if (!foundSession) return Res.send({ status: 401 });
  
  if (getAccount.Connections && getAccount.Connections.Discord && getAccount.Connections.Discord.ID !== "") {
    if ((Number(getAccount.Connections.Discord.LastUpdate) + (60 * 30)) > (Date.now() / 1000)) return Res.send({ status: 403, message: 'Você vinculou a sua conta ou sincronizou os dados a pouco tempo, aguarde para sincronizar novamente.' }); 
    
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: '1274868905554481277',
      client_secret: process.env.DiscordToken,
      grant_type: 'refresh_token',
      refresh_token: getAccount.Connections.Discord.Token
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }});

    const userResponse = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }});
    
    const getConnectionObject = getAccount.Connections.Discord;
    getConnectionObject.Username = userResponse.data.username;
    getConnectionObject.Token = tokenResponse.data.refresh_token;
    getConnectionObject.LastUpdate = Math.round(Date.now() / 1000);
    
    await accountScheme.findOneAndUpdate({ ID: getAccountID }, { 'Connections.Discord': getConnectionObject });
    return Res.send({ status: 200, message: 'Os dados foram sincronizados com sucesso.' });    
  } else {
    return Res.send({ status: 403 }); 
  }
}