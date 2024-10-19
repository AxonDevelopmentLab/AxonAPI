const WebSocket = require('ws');
const crypto = require('crypto');

exports.run = (Server, routes) => {
  const wss = new WebSocket.Server({ server: Server, path: '/websocket' });

  let temp_ws = [];
  const wssettings = {
    add: (Token, WS) => {

    },
    remove: (Token) => {

    },
    exists: (Token) => {

    }
  }

  wss.on('connection', (ws) => {
      const generateToken = crypto.randomBytes(16).toString('hex');
      wssettings.add(generateToken, ws);

      ws.on('message', (message) => {
        let RequestData = {
          WebSocket: true,
          SecondEncryption: false,
          IP: '0.0.0.0'
        }

        try {
          const wsBody = JSON.parse(message);
          if (!wsBody.route) return ws.send(JSON.stringify({ status: 400 }));
          if (!wsBody.data) return ws.send(JSON.stringify({ status: 400 }));

          const findRoute = routes.find(route => route.url === wsBody.route);
          const getService = require('./services/' + findRoute.path);

          const req = { body: wsBody.data };
          const res = { send: (Data) => { ws.send(JSON.stringify({ response_token: wsBody.response_token || undefined, data: Data }))} };
          delete req.body.route;

          return getService.load(RequestData, req, res, findRoute.url);
        } catch (error) {
          return ws.send(JSON.stringify({ status: 400 }));
        };
      });

      ws.on('close', () => {
        wssettings.remove(generateToken);
      });
  });
}