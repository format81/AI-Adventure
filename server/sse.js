// SSE (Server-Sent Events) connection manager
// Map: sessionId -> Set<Response>
const connections = new Map();

function addConnection(sessionId, res) {
  if (!connections.has(sessionId)) {
    connections.set(sessionId, new Set());
  }
  connections.get(sessionId).add(res);

  // Remove on disconnect
  res.on('close', () => {
    const set = connections.get(sessionId);
    if (set) {
      set.delete(res);
      if (set.size === 0) connections.delete(sessionId);
    }
  });
}

function broadcast(sessionId, event, data) {
  const set = connections.get(sessionId);
  if (!set) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    res.write(payload);
  }
}

function getConnectionCount(sessionId) {
  const set = connections.get(sessionId);
  return set ? set.size : 0;
}

// Heartbeat: send ping comment every 30s to keep connections alive
setInterval(() => {
  for (const [, set] of connections) {
    for (const res of set) {
      res.write(': ping\n\n');
    }
  }
}, 30000);

module.exports = { addConnection, broadcast, getConnectionCount };
