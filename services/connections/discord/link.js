const axios = require('axios');

const accountScheme = require("../../../database/account");

exports.load = async (RequestData, Req, Res) => {
  const ID = Req.query.id;
  const CODE = Req.query.code;
  
  if (!ID) return Res.send(`<body onload="location.href='` + `https://axonhub.glitch.me/account?message=${encodeURIComponent('Ocorreu um erro ao vincular o seu Discord.')}` + `'"></body>`);
  if (!CODE) return Res.send(`<body onload="location.href='` + `https://axonhub.glitch.me/account?message=${encodeURIComponent('Ocorreu um erro ao vincular o seu Discord.')}` + `'"></body>`)
  
  const getAccount = await accountScheme.findOne({ ID: ID });
  if (!getAccount) return Res.send(`<body onload="location.href='` + `https://axonhub.glitch.me/account?message=${encodeURIComponent('Não foi possivel logar na sua conta.')}` + `'"></body>`);
  if (getAccount.Connections && getAccount.Connections.Discord && getAccount.Connections.Discord.ID !== "") return Res.send(`<body onload="location.href='` + `https://axonhub.glitch.me/account?message=${encodeURIComponent('Você já tem uma conta do Discord vinculada a sua conta.')}` + `'"></body>`);
  
  const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
    client_id: '1274868905554481277',
    client_secret: process.env.DiscordToken,
    grant_type: 'authorization_code',
    code: CODE,
    redirect_uri: 'https://axonhub.glitch.me/account?message=PRESET_01&changetype=true&redirectTo=https://axon-api.glitch.me/connections/discord&passContent=id,code'
  }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }});

  const userResponse = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }});
  
  const findAlreadyDiscord = await accountScheme.findOne({ "Connections.Discord.ID": userResponse.data.id });
  if (findAlreadyDiscord) return Res.send(`<body onload="location.href='` + `https://axonhub.glitch.me/account?message=${encodeURIComponent('Esse discord já está vinculado<br>a outra conta.')}` + `'"></body>`);
  
  if (!getAccount.Connections || !getAccount.Connections.Discord) {
    //Primeira vez vinculando o Discord
  }
  
  await accountScheme.findOneAndUpdate({ ID: ID }, { 'Connections.Discord': {
    Token: tokenResponse.data.refresh_token,
    ID: userResponse.data.id,
    Username: userResponse.data.username,
    LastUpdate: Math.round(Date.now() / 1000)
  }});
  
  return Res.send(`<body onload="location.href='` + `https://axonhub.glitch.me/account?message=${encodeURIComponent('O seu Discord foi vinculado com sucesso<br>a sua conta da AxonHub.')}` + `'"></body>`)
}