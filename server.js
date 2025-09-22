const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3050;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store WebSocket connections by receipt ID
const receiptConnections = new Map();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  });

  // Create WebSocket server
  const wss = new WebSocketServer({
    server,
    path: '/api/websocket'
  });

  wss.on('connection', (ws, req) => {
    const url = parse(req.url, true);
    const receiptId = url.query.receiptId;

    if (!receiptId) {
      ws.close(1008, 'Receipt ID is required');
      return;
    }

    console.log(`WebSocket connected for receipt ${receiptId}`);

    // Add connection to receipt group
    if (!receiptConnections.has(receiptId)) {
      receiptConnections.set(receiptId, new Set());
    }
    receiptConnections.get(receiptId).add(ws);

    // Send initial connection message
    ws.send(JSON.stringify({
      type: 'connected',
      receiptId,
      timestamp: new Date().toISOString()
    }));

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Broadcast message to all other connections for this receipt
        const connections = receiptConnections.get(receiptId);
        if (connections) {
          connections.forEach(client => {
            if (client !== ws && client.readyState === ws.constructor.OPEN) {
              client.send(JSON.stringify({
                ...message,
                timestamp: new Date().toISOString()
              }));
            }
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    // Handle connection close
    ws.on('close', () => {
      console.log(`WebSocket disconnected for receipt ${receiptId}`);

      const connections = receiptConnections.get(receiptId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          receiptConnections.delete(receiptId);
        }
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send periodic ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.constructor.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/websocket`);
  });
});