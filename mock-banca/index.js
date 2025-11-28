const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;
const HMAC_SECRET = process.env.HMAC_SECRET || 'mock_banca_secret';
const LOTOLINK_WEBHOOK_URL = process.env.LOTOLINK_WEBHOOK_URL || 'http://localhost:3000/webhooks/plays/confirmation';

// Simulated plays storage
const plays = new Map();

// Configuration for behavior simulation
const config = {
  syncResponseRate: 0.7, // 70% chance of synchronous response
  confirmRate: 0.95, // 95% chance of confirmation
  asyncDelayMs: 5000, // 5 second delay for async responses
};

/**
 * Calculate HMAC signature for webhook calls
 */
function calculateSignature(method, path, timestamp, body) {
  const signatureBase = `${method}${path}${timestamp}${body}`;
  const hmac = crypto.createHmac('sha256', HMAC_SECRET);
  hmac.update(signatureBase);
  return hmac.digest('base64');
}

/**
 * Send async confirmation webhook to Lotolink
 */
async function sendWebhookConfirmation(requestId, playIdBanca, ticketCode, status, reason = null) {
  const timestamp = new Date().toISOString();
  const payload = {
    requestId,
    playIdBanca,
    ticketCode,
    status,
    reason,
  };
  const bodyStr = JSON.stringify(payload);
  const signature = calculateSignature('POST', '/webhooks/plays/confirmation', timestamp, bodyStr);

  try {
    const response = await fetch(LOTOLINK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': timestamp,
      },
      body: bodyStr,
    });
    console.log(`[Webhook] Sent ${status} for ${requestId}, response: ${response.status}`);
  } catch (error) {
    console.error(`[Webhook] Failed to send for ${requestId}:`, error.message);
  }
}

/**
 * Generate ticket code
 */
function generateTicketCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TKT-${code}`;
}

// ========== ENDPOINTS ==========

/**
 * POST /v1/plays/register
 * Main endpoint for registering plays from Lotolink
 */
app.post('/v1/plays/register', (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  const { requestId, play, payment, user } = req.body;

  console.log(`[Register] Received play request: ${requestId}`);
  console.log(`[Register] Play:`, JSON.stringify(play));

  // Check idempotency
  if (idempotencyKey && plays.has(idempotencyKey)) {
    const existing = plays.get(idempotencyKey);
    console.log(`[Register] Idempotent request, returning existing: ${existing.playIdBanca}`);
    return res.status(200).json({
      status: existing.status,
      playIdBanca: existing.playIdBanca,
      ticketCode: existing.ticketCode,
    });
  }

  const playIdBanca = `BANCA-${uuidv4().substring(0, 8).toUpperCase()}`;
  const ticketCode = generateTicketCode();

  // Decide if we respond synchronously or asynchronously
  const respondSync = Math.random() < config.syncResponseRate;
  const isConfirmed = Math.random() < config.confirmRate;

  if (respondSync) {
    // Synchronous response
    const status = isConfirmed ? 'confirmed' : 'rejected';
    const playRecord = {
      requestId,
      playIdBanca,
      ticketCode: isConfirmed ? ticketCode : null,
      status,
      createdAt: new Date(),
    };

    if (idempotencyKey) {
      plays.set(idempotencyKey, playRecord);
    }

    console.log(`[Register] Sync response: ${status}`);

    return res.status(200).json({
      status,
      playIdBanca,
      ticketCode: isConfirmed ? ticketCode : undefined,
      message: isConfirmed ? 'Play registered successfully' : 'Play rejected due to limits',
    });
  } else {
    // Asynchronous response (202 Accepted)
    const playRecord = {
      requestId,
      playIdBanca,
      ticketCode: null,
      status: 'pending',
      createdAt: new Date(),
    };

    if (idempotencyKey) {
      plays.set(idempotencyKey, playRecord);
    }

    console.log(`[Register] Async response: accepted, will send webhook in ${config.asyncDelayMs}ms`);

    // Schedule webhook callback
    setTimeout(async () => {
      const finalStatus = isConfirmed ? 'confirmed' : 'rejected';
      const finalTicketCode = isConfirmed ? ticketCode : null;
      const reason = isConfirmed ? null : 'Play rejected after review';

      // Update local record
      if (idempotencyKey && plays.has(idempotencyKey)) {
        const record = plays.get(idempotencyKey);
        record.status = finalStatus;
        record.ticketCode = finalTicketCode;
      }

      await sendWebhookConfirmation(requestId, playIdBanca, finalTicketCode, finalStatus, reason);
    }, config.asyncDelayMs);

    return res.status(202).json({
      status: 'accepted',
      playIdBanca,
      message: 'Play accepted for processing, confirmation will be sent via webhook',
    });
  }
});

/**
 * GET /v1/plays/:playIdBanca/status
 * Check status of a play
 */
app.get('/v1/plays/:playIdBanca/status', (req, res) => {
  const { playIdBanca } = req.params;
  
  // Find play in our storage
  for (const [_, play] of plays) {
    if (play.playIdBanca === playIdBanca) {
      return res.status(200).json({
        playIdBanca: play.playIdBanca,
        status: play.status,
        ticketCode: play.ticketCode,
      });
    }
  }

  return res.status(404).json({
    error: 'Play not found',
    playIdBanca,
  });
});

/**
 * GET /health
 * Health check
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'mock-banca',
    timestamp: new Date().toISOString(),
    plays_count: plays.size,
  });
});

/**
 * POST /admin/config
 * Configure mock behavior for testing
 */
app.post('/admin/config', (req, res) => {
  const { syncResponseRate, confirmRate, asyncDelayMs } = req.body;
  
  if (syncResponseRate !== undefined) config.syncResponseRate = syncResponseRate;
  if (confirmRate !== undefined) config.confirmRate = confirmRate;
  if (asyncDelayMs !== undefined) config.asyncDelayMs = asyncDelayMs;

  console.log('[Admin] Config updated:', config);
  
  res.status(200).json({
    message: 'Configuration updated',
    config,
  });
});

/**
 * GET /admin/plays
 * List all registered plays (for debugging)
 */
app.get('/admin/plays', (req, res) => {
  const playsList = [];
  for (const [key, play] of plays) {
    playsList.push({ idempotencyKey: key, ...play });
  }
  res.status(200).json(playsList);
});

/**
 * POST /admin/reset
 * Reset all plays (for testing)
 */
app.post('/admin/reset', (req, res) => {
  plays.clear();
  console.log('[Admin] All plays cleared');
  res.status(200).json({ message: 'All plays cleared' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎰 Mock Banca Service running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`⚙️  Config: syncResponseRate=${config.syncResponseRate}, confirmRate=${config.confirmRate}`);
});
