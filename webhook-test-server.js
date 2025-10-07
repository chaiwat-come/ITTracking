const http = require('http');
const crypto = require('crypto');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your_webhook_secret_here_change_in_production';
const PORT = process.env.PORT || 4000;

// Function to verify HMAC signature
function verifyWebhookSignature(payload, signature) {
  try {
    const parts = signature.split(',');
    const timestampPart = parts.find(part => part.startsWith('t='));
    const hmacPart = parts.find(part => part.startsWith('hmac='));

    if (!timestampPart || !hmacPart) return false;

    const timestamp = parseInt(timestampPart.split('=')[1]);
    const receivedHmac = hmacPart.split('=')[1];

    // Check timestamp (max 5 minutes old)
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - timestamp > 300) {
      console.log('Webhook rejected: timestamp too old');
      return false;
    }

    // Generate expected signature
    const data = `${timestamp}.${payload}`;
    const expectedHmac = crypto.createHmac('sha256', WEBHOOK_SECRET).update(data).digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(receivedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    );
  } catch {
    return false;
  }
}

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      const signature = req.headers['x-signature'];
      
      if (!signature) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing X-Signature header' }));
        return;
      }

      if (!verifyWebhookSignature(body, signature)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid signature or expired timestamp' }));
        return;
      }

      try {
        const payload = JSON.parse(body);
        
        // Log the webhook
        const logEntry = {
          timestamp: new Date().toISOString(),
          signature,
          payload,
          verified: true
        };

        console.log('✅ Valid webhook received:');
        console.log(JSON.stringify(logEntry, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'Webhook received and verified successfully',
          event: payload.event,
          issue_id: payload.issue_id,
          new_status: payload.new_status,
          updated_by: payload.updated_by,
          received_at: new Date().toISOString()
        }));

      } catch (error) {
        console.error('❌ Invalid JSON payload:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'webhook-test-server',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Webhook test server running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 HMAC-SHA256 verification enabled`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Webhook test server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Webhook test server closed');
    process.exit(0);
  });
});
