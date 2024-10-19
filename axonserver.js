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

let cache = {
  uptime: 1,
  total: 0,
  hour: 0
}

app.use(express.json({ limit: '1mb' }), express.urlencoded({ limit: '1mb', extended: true }), compression(), cors());

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

app.get('/', (req, res) => {
  cache.total++;
  cache.hour++;
  res.send({ status: 200, requests: {
    total: cache.total,
    last_hour: cache.hour,
    statistics: {
      average_per_hour: Number(cache.total / cache.uptime).toFixed(2),
      ratelimit: `${cache.hour}/4000`
    }
  }})
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
        cache.total++; cache.hour++;
      
        const RequestData = {
          WebSocket: false,
          SecondEncryption: false,
          IP: req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress
        };
      
        const getService = require('./services/' + route.path);
        getService.load(RequestData, req, res, route.url);
    });
});


server.listen(8080, () => {console.log(`[AxonAPI] Started.`); });

require('./services/science/analysis.js');

const websocket_api = require('./websocket.js')
websocket_api.run(server, routes);

const background_cron = require('./services/background/cron.js');
background_cron.start();

setInterval(() => { cache.uptime++; cache.hour = 0; }, 1000 * 60 * 60);