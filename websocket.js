const WebSocket = require('ws');

exports.run = (Server, routes) => {
  const wss = new WebSocket.Server({ server: Server, path: '/websocket' });

  wss.on('connection', (ws, req) => {
      ws.on('message', (message) => {
        let RequestData = {
          WebSocket: true,
          IP: req.socket.remoteAddress
        };

        try {
          const wsBody = JSON.parse(message);
          if (!wsBody.route) return ws.send(JSON.stringify({ status: 400 }));
          if (!wsBody.data) return ws.send(JSON.stringify({ status: 400 }));

          const findRoute = routes.find(route => route.url === wsBody.route);
          if (!findRoute) return ws.send(JSON.stringify({ status: 400 }));

          const getService = require('./services/' + findRoute.path);

          const req = { body: wsBody.data };
          const res = { send: (Data) => { ws.send(JSON.stringify({ response_token: wsBody.response_token || undefined, data: Data }))} };
          delete req.body.route;

          return getService.load(RequestData, req, res, findRoute.url);
        } catch (error) {
          return ws.send(JSON.stringify({ status: 400, log: 'Error ocurred at transforming websocket request into restful request. This problem ocurred in the server-side connection manager, contact the support.' }));
        };
      });
  });
}