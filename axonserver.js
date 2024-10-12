const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const { exec, execSync } = require('child_process');
const helmet = require('helmet');
const cors = require("cors");
const crypto = require('crypto');

console.log('sucessfully worked');

const app = express();

app.use(bodyParser.json());
app.post('/git', (req, res) => {
  let hmac = crypto.createHmac("sha1", process.env.SECRET);
  let sig  = "sha1=" + hmac.update(JSON.stringify(req.body)).digest("hex");
  if (req.headers['x-github-event'] == "push" && sig == req.headers['x-hub-signature']) {
    execSync('chmod 777 ./git.sh'); 
    setTimeout(() => {
      exec('./git.sh', (err, stdout, stderr) => {
        if (stdout) console.log(stdout);
        if (err) console.error(stderr);
      });

      execSync('refresh');
    }, 10000)
  };
  
  return res.sendStatus(200);
});

app.use(helmet())
app.use(express.json({ limit: '1mb' }), express.urlencoded({ limit: '1mb', extended: true }), compression(), cors());

let TotalRequests = 0;

const mongoose = require('mongoose')
mongoose.connect(process.env.MongooseAuth, { useNewUrlParser: true, useUnifiedTopology: true });

const routes = [
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

app.get('/', (req, res) => { TotalRequests++; res.send({ status: 200, requestsSinceLastRestart: TotalRequests })});
routes.forEach(route => {
    app[route.type](route.url, (req, res) => {
        TotalRequests++;
        const RequestIP = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress;
        const getService = require('./services/' + route.path);
        getService.load(RequestIP, req, res, route.url);
    });
});

const server = app.listen(8080, () => { console.clear(); console.log('[AxonHub] Service is running.')});

const background_cron = require('./services/background/cron.js');
background_cron.start();
