/**
 * Mock Redis Server
 * Simulates Redis for development/testing
 * Port: 6379
 */

const net = require('net');

// In-memory store
const store = new Map();
const ttlMap = new Map();

// Redis command parser and executor
function executeCommand(command) {
  const parts = command.trim().split(/\s+/);
  const cmd = (parts[0] || '').toUpperCase();
  
  switch (cmd) {
    case 'PING':
      return '+PONG\r\n';
    
    case 'SET': {
      const key = parts[1];
      const value = parts[2];
      if (!key || !value) return "-ERR wrong number of arguments for 'set' command\r\n";
      store.set(key, value);
      return '+OK\r\n';
    }
    
    case 'GET': {
      const key = parts[1];
      if (!key) return "-ERR wrong number of arguments for 'get' command\r\n";
      const value = store.get(key);
      if (!value) return '$-1\r\n';
      return '$' + value.length + '\r\n' + value + '\r\n';
    }
    
    case 'DEL': {
      let count = 0;
      for (let i = 1; i < parts.length; i++) {
        if (store.has(parts[i])) {
          store.delete(parts[i]);
          ttlMap.delete(parts[i]);
          count++;
        }
      }
      return ':' + count + '\r\n';
    }
    
    case 'EXISTS': {
      let count = 0;
      for (let i = 1; i < parts.length; i++) {
        if (store.has(parts[i])) count++;
      }
      return ':' + count + '\r\n';
    }
    
    case 'FLUSHALL':
      store.clear();
      ttlMap.clear();
      return '+OK\r\n';
    
    case 'FLUSHDB':
      store.clear();
      ttlMap.clear();
      return '+OK\r\n';
    
    case 'KEYS': {
      const pattern = parts[1] || '*';
      const keys = Array.from(store.keys());
      if (pattern === '*') {
        let response = '*' + keys.length + '\r\n';
        keys.forEach(k => {
          response += '$' + k.length + '\r\n' + k + '\r\n';
        });
        return response;
      }
      return '*0\r\n';
    }
    
    case 'DBSIZE': {
      return ':' + store.size + '\r\n';
    }
    
    case 'ECHO': {
      const message = parts.slice(1).join(' ');
      return '$' + message.length + '\r\n' + message + '\r\n';
    }
    
    case 'SELECT': {
      // Just accept any database selection
      return '+OK\r\n';
    }
    
    case 'EXPIRE':
    case 'EXPIREAT':
    case 'TTL':
    case 'PTTL':
      return ':1\r\n';
    
    case 'RPUSH':
    case 'LPUSH':
    case 'LPOP':
    case 'RPOP':
      return ':1\r\n';

    case 'LRANGE': {
      return '*0\r\n';
    }
    
    case 'COMMAND':
      return '*0\r\n';
    
    default:
      return "-ERR unknown command '" + cmd + "'\r\n";
  }
}

const server = net.createServer((socket) => {
  console.log('  → New client connected');
  
  let buffer = '';
  
  socket.on('data', (data) => {
    buffer += data.toString();
    
    // Process complete commands (separated by \r\n)
    while (buffer.includes('\r\n')) {
      const index = buffer.indexOf('\r\n');
      const line = buffer.substring(0, index);
      buffer = buffer.substring(index + 2);
      
      if (line) {
        const response = executeCommand(line);
        socket.write(response);
      }
    }
  });
  
  socket.on('end', () => {
    console.log('  → Client disconnected');
  });
  
  socket.on('error', (err) => {
    console.error('  → Socket error:', err.message);
  });
});

const PORT = 6379;

server.listen(PORT, '127.0.0.1', () => {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  🔴 Redis Mock Server                         ║');
  console.log('║  Port: ' + PORT + '                                  ║');
  console.log('║  Status: ONLINE                               ║');
  console.log('║  URL: redis://localhost:' + PORT + '                ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
});

process.on('SIGTERM', () => {
  console.log('\nRedis Mock Server stopped');
  server.close();
});

process.on('SIGINT', () => {
  console.log('\nRedis Mock Server stopped');
  server.close();
});
