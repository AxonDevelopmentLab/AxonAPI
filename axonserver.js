const { execSync } = require('child_process');
const compression = require('compression');
const bodyParser = require('body-parser');
const mongoose = require('mongoose')
const express = require('express');
const crypto = require('crypto');
const helmet = require('helmet');
const cors = require("cors");
const http = require('http');

const app = express();
const server = http.createServer(app);

mongoose.connect(process.env.MongooseAuth, { useNewUrlParser: true, useUnifiedTopology: true });
app.use(express.json({ limit: '1mb' }), express.urlencoded({ limit: '1mb', extended: true }), compression(), cors());

app.get('/', (req, res) => { res.send({ status: 200 }) });
app.post('/git', (req, res) => {
  let hmac = crypto.createHmac("sha1", process.env.SECRET);
  let sig  = "sha1=" + hmac.update(JSON.stringify(req.body)).digest("hex");

  if (req.headers['x-github-event'] == "push" && sig == req.headers['x-hub-signature']) {
    execSync('chmod 777 ./git.sh'); 
    execSync('./git.sh')
    execSync('refresh');
  };
  
  return res.sendStatus(200);
});

const routes = [
  { url: '/services/instalock/statistics', type: 'post', path: 'services/instalock/statistics.js' },
  { url: '/science/security', type: 'post', path: 'science/security.js' },
  { url: '/science/logs', type: 'post', path: 'science/logs.js' },
  { url: '/science/analysis', type: 'post', path: 'science/analysis.js' },
  { url: '/auth/login', type: 'post', path: 'auth/login.js' },
  { url: '/auth/register', type: 'post', path: 'auth/register.js' },
  { url: '/email_verification', type: 'get', path: 'auth/email_verification.js' },
  { url: '/account/get', type: 'post', path: 'accountmanager/getdetails.js' },
  { url: '/account/close_session', type: 'post', path: 'accountmanager/closesession.js' },
  { url: '/account/management', type: 'post', path: 'accountmanager/management.js' },
  { url: '/support/ticket', type: 'post', path: 'support/ticket.js' },
  { url: '/connections/discord', type: 'get', path: 'connections/discord/link.js' },
  { url: '/connections/discord/sync', type: 'post', path: 'connections/discord/sync.js' },
  { url: '/connections/discord/unlink', type: 'post', path: 'connections/discord/unlink.js' },
  { url: '/store/checkout/discount', type: 'post', path: 'store/discount.js' },
  { url: '/store/checkout/create', type: 'post', path: 'store/create.js' },
  { url: '/store/checkout/notifications', type: 'post', path: 'store/notifications.js' },
  { url: '/store/checkout/status', type: 'post', path: 'store/status.js' },
];

routes.forEach(route => {
    app[route.type](route.url, (req, res) => {
      
        const RequestData = {
          WebSocket: false,
          IP: req.headers['x-forwarded-for']?.split(',').shift()
        };
      
        const getService = require('./services/' + route.path);
        getService.load(RequestData, req, res, route.url);
    });
});


server.listen(8080, () => {console.log(`[AxonAPI] Started.`); });
require('./services/science/analysis.js');
require('./websocket.js').run(server, routes);
require('./services/background/cron.js').start();