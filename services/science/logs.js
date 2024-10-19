const validator = require('validator');
const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');

const accountScheme = require("../../database/account");
const securityValidator = require('../background/security_validator.js');

exports.load = async (RequestData, Req, Res) => {
    const body = Req.body;
    if (!body.env_integrity || !body.auth_token || !body.log || !body.log.message || !body.log.content) return Res.send({ status: 400 });
    
    const ThreadDetected = await securityValidator.InstalockAPP(body.env_integrity);
    if (ThreadDetected) return Res.send({ status: 403 });

    const getAccountID = body.auth_token.split(':')[0];
    const getAccount = await accountScheme.findOne({ ID: getAccountID });
    if (!getAccount) return Res.send({ status: 401 });

    const getAllSessions = getAccount.Devices.AllDevices;
    const foundSession = getAllSessions.find(i => i.Token === body.auth_token);
    if (!foundSession) return Res.send({ status: 401 });

    if (!body.log.message || body.log.message.length < 1) body.log.message = 'Not Defined.'
    body.log.message = validator.escape(body.log.message);
  
    const LogStructure = {
      details: {
        timestamp: Math.round(Date.now() / 1000),
        sended_by_username: getAccount.Username.Current,
        sended_by_ip: RequestData.IP,
        content: body.log.message
      },
      log: Req.body
    }
  
    const logObject = JSON.stringify(LogStructure, null, 2);
    const buffer = Buffer.from(logObject);
  
    const filename = crypto.randomBytes(6).toString('hex') + '.json';
    const formData = new FormData();
    formData.append('file', buffer, {
        filename: filename,
        contentType: 'application/json'
    });

    try {
      const response = await axios.post(process.env.DiscordLogsChannel, formData, { headers: { ...formData.getHeaders() }});
      return Res.send({ status: 200 });
    } catch (error) {
        return Res.send({ status: 503 })
    }
};
