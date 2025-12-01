/**
 * Lotolink Integration Example - Node.js
 * 
 * Este ejemplo muestra cómo integrar una banca con Lotolink.
 * Incluye: autenticación OAuth2, recepción de jugadas, y envío de webhooks.
 */

const crypto = require('crypto');
const express = require('express');
const app = express();
app.use(express.json());

// ============================================================
// CONFIGURACIÓN (Obtener de Lotolink)
// ============================================================
const LOTOLINK_CONFIG = {
  clientId: process.env.LOTOLINK_CLIENT_ID || 'your_client_id',
  clientSecret: process.env.LOTOLINK_CLIENT_SECRET || 'your_client_secret',
  hmacSecret: process.env.LOTOLINK_HMAC_SECRET || 'your_hmac_secret',
  webhookUrl: process.env.LOTOLINK_WEBHOOK_URL || 'https://api.lotolink.com/webhooks/plays/confirmation',
  apiUrl: process.env.LOTOLINK_API_URL || 'https://api.lotolink.com',
};

// ============================================================
// HMAC SIGNATURE UTILITIES
// ============================================================

/**
 * Genera firma HMAC-SHA256 para webhooks
 */
function signRequest(method, path, timestamp, body) {
  const signatureBase = `${method}${path}${timestamp}${body}`;
  const hmac = crypto.createHmac('sha256', LOTOLINK_CONFIG.hmacSecret);
  hmac.update(signatureBase);
  return hmac.digest('base64');
}

/**
 * Verifica firma HMAC de requests entrantes
 */
function verifySignature(method, path, timestamp, body, signature) {
  const expectedSignature = signRequest(method, path, timestamp, body);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Middleware para validar requests de Lotolink
 */
function validateLotolinkRequest(req, res, next) {
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  
  if (!signature || !timestamp) {
    return res.status(401).json({ error: 'Missing signature or timestamp' });
  }

  // Validar timestamp (±120 segundos)
  const requestTime = new Date(timestamp).getTime();
  const currentTime = Date.now();
  if (Math.abs(currentTime - requestTime) > 120000) {
    return res.status(401).json({ error: 'Timestamp out of range' });
  }

  const body = JSON.stringify(req.body);
  if (!verifySignature(req.method, req.path, timestamp, body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

// ============================================================
// ENDPOINT: Recibir jugada de Lotolink
// ============================================================

/**
 * POST /v1/plays/register
 * 
 * Lotolink envía jugadas a este endpoint.
 * La banca debe procesar y confirmar via webhook.
 */
app.post('/v1/plays/register', validateLotolinkRequest, async (req, res) => {
  const { request_id, user_id, play, payment } = req.body;

  console.log(`Recibida jugada: ${request_id}`);
  console.log(`Lotería: ${play.lottery_id}, Modalidad: ${play.modality}`);
  console.log(`Números: ${play.numbers.join(', ')}, Monto: ${play.amount} ${play.currency}`);

  try {
    // 1. Validar que la jugada no exista (idempotencia)
    const existingPlay = await findPlayByRequestId(request_id);
    if (existingPlay) {
      return res.status(409).json({
        status: 'duplicate',
        play_id_banca: existingPlay.id,
        message: 'Jugada ya procesada anteriormente'
      });
    }

    // 2. Validar disponibilidad de números
    const isAvailable = await checkNumbersAvailable(play.lottery_id, play.numbers);
    if (!isAvailable) {
      // Enviar rechazo inmediato
      await sendWebhookConfirmation(request_id, 'rejected', null, 'Números no disponibles');
      return res.status(200).json({
        status: 'rejected',
        message: 'Números no disponibles'
      });
    }

    // 3. Registrar la jugada en el sistema de la banca
    const bancaPlayId = await registerPlayInBanca({
      request_id,
      lottery_id: play.lottery_id,
      modality: play.modality,
      numbers: play.numbers,
      amount: play.amount,
      currency: play.currency,
    });

    // 4. Generar ticket
    const ticketCode = generateTicketCode();

    // 5. Responder a Lotolink (aceptada para procesamiento)
    res.status(201).json({
      status: 'pending',
      play_id_banca: bancaPlayId,
      message: 'Jugada recibida, procesando...'
    });

    // 6. Enviar confirmación via webhook (async)
    setTimeout(async () => {
      await sendWebhookConfirmation(request_id, 'confirmed', ticketCode);
    }, 1000);

  } catch (error) {
    console.error('Error procesando jugada:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del sistema'
    });
  }
});

// ============================================================
// WEBHOOK: Enviar confirmación a Lotolink
// ============================================================

/**
 * Envía confirmación de jugada a Lotolink
 */
async function sendWebhookConfirmation(requestId, status, ticketCode = null, message = null) {
  const timestamp = new Date().toISOString();
  const body = JSON.stringify({
    request_id: requestId,
    play_id_banca: `BANCA_${Date.now()}`,
    status: status, // 'confirmed' | 'rejected' | 'error'
    ticket_code: ticketCode,
    message: message,
    timestamp: timestamp,
  });

  const signature = signRequest(
    'POST',
    '/webhooks/plays/confirmation',
    timestamp,
    body
  );

  try {
    const response = await fetch(LOTOLINK_CONFIG.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': timestamp,
      },
      body: body,
    });

    if (response.ok) {
      console.log(`Webhook enviado exitosamente para ${requestId}`);
    } else {
      console.error(`Error en webhook: ${response.status}`);
    }
  } catch (error) {
    console.error('Error enviando webhook:', error);
  }
}

// ============================================================
// FUNCIONES DE EJEMPLO (Implementar según tu sistema)
// ============================================================

async function findPlayByRequestId(requestId) {
  // TODO: Buscar en tu base de datos
  return null;
}

async function checkNumbersAvailable(lotteryId, numbers) {
  // TODO: Verificar disponibilidad en tu sistema
  return true;
}

async function registerPlayInBanca(play) {
  // TODO: Registrar en tu sistema y retornar ID
  return `PLAY_${Date.now()}`;
}

function generateTicketCode() {
  return `TKT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

// ============================================================
// INICIAR SERVIDOR
// ============================================================

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🎰 Banca API corriendo en puerto ${PORT}`);
  console.log(`📥 Endpoint de jugadas: POST http://localhost:${PORT}/v1/plays/register`);
});

module.exports = app;
