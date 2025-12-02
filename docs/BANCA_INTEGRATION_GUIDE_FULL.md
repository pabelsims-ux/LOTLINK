# Lotolink - Guía de Integración para Bancas

---

**Versión:** 1.0  
**Fecha:** Diciembre 2025  
**Contacto:** integraciones@lotolink.com

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Integración API Directa](#2-integración-api-directa)
3. [Ejemplos de Código](#3-ejemplos-de-código)
4. [Webhooks](#4-webhooks)
5. [Testing](#5-testing)
6. [App White-Label (Alternativa)](#6-app-white-label-alternativa)
7. [FAQ - Preguntas Frecuentes](#7-faq---preguntas-frecuentes)
8. [Contacto y Soporte](#8-contacto-y-soporte)
9. [Apéndices](#apéndices)

---

## 1. Introducción

### 1.1 ¿Qué es Lotolink?

Lotolink es un marketplace/intermediario que conecta usuarios con bancas de lotería. La plataforma recibe jugadas (apuestas) de usuarios a través de una aplicación móvil y las enruta a bancas registradas que procesan y confirman las jugadas.

### 1.2 Beneficios para Bancas

| Beneficio | Descripción |
|-----------|-------------|
| **Mayor alcance** | Acceso a miles de usuarios de la app Lotolink |
| **Automatización** | Recepción automática de jugadas vía API |
| **Conciliación** | Sistema automatizado de conciliación y pagos |
| **Soporte técnico** | Equipo dedicado para integraciones |
| **Dashboard** | Panel de control para monitorear operaciones |

### 1.3 Opciones de Integración

| Opción | Descripción | Ideal para | Tiempo |
|--------|-------------|------------|--------|
| **API Directa** | Conexión sistema-a-sistema vía REST API | Bancas con software propio | 1-2 semanas |
| **App White-Label** | App POS provista por Lotolink | Bancas sin sistema digital | 1 día |

---

## 2. Integración API Directa

### 2.1 Requisitos Técnicos

**Infraestructura requerida:**

- Servidor HTTPS con certificado válido
- Endpoint público accesible desde Internet
- Soporte para JSON (Content-Type: application/json)
- Capacidad de generar/verificar firmas HMAC-SHA256

**Compatibilidad:**

- HTTP/1.1 o HTTP/2
- TLS 1.2 o superior
- Timeout recomendado: 30 segundos

### 2.2 Credenciales Necesarias

Al registrarse como banca en Lotolink, recibirá las siguientes credenciales:

| Credencial | Descripción | Uso |
|------------|-------------|-----|
| `client_id` | Identificador único de la banca | OAuth2 authentication |
| `client_secret` | Secreto para OAuth2 | Obtener tokens de acceso |
| `hmac_secret` | Clave compartida para firmas | Firmar/verificar webhooks |
| `webhook_url` | URL configurada para recibir confirmaciones | Recibir notificaciones |

### 2.3 Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE INTEGRACIÓN LOTOLINK                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Usuario   │         │     Lotolink    │         │      Banca      │
│    (App)    │         │    (Backend)    │         │    (Sistema)    │
└──────┬──────┘         └────────┬────────┘         └────────┬────────┘
       │                         │                           │
       │  1. Crear jugada        │                           │
       │  (selecciona números)   │                           │
       │ ───────────────────────>│                           │
       │                         │                           │
       │                         │  2. POST /v1/plays/register
       │                         │  (con firma HMAC)         │
       │                         │ ─────────────────────────>│
       │                         │                           │
       │                         │                           │  3. Validar
       │                         │                           │     firma
       │                         │                           │     ↓
       │                         │                           │  4. Registrar
       │                         │                           │     jugada
       │                         │                           │     ↓
       │                         │  5. Response              │
       │                         │  {status: "pending"}      │
       │                         │ <─────────────────────────│
       │                         │                           │
       │  6. "Procesando..."     │                           │
       │ <───────────────────────│                           │
       │                         │                           │
       │                         │  7. POST /webhooks/plays/confirmation
       │                         │  (confirmación async)     │
       │                         │ <─────────────────────────│
       │                         │                           │
       │                         │  8. 200 OK                │
       │                         │ ─────────────────────────>│
       │                         │                           │
       │  9. "¡Confirmado!"      │                           │
       │  (push notification)    │                           │
       │ <───────────────────────│                           │
       │                         │                           │
```

### 2.4 Endpoints Completos

#### Endpoint que la Banca debe implementar

**POST /v1/plays/register**

Lotolink envía jugadas a este endpoint.

**Headers:**

| Header | Tipo | Descripción |
|--------|------|-------------|
| `Content-Type` | string | `application/json` |
| `Authorization` | string | `Bearer <token>` (OAuth2) |
| `X-Signature` | string | Firma HMAC-SHA256 en Base64 |
| `X-Timestamp` | string | Timestamp ISO-8601 |
| `Idempotency-Key` | string | UUID único para idempotencia |

**Request Body:**

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "play": {
    "lottery_id": "lottoRD_01",
    "modality": "quiniela",
    "numbers": ["03", "07", "12"],
    "amount": 50.00,
    "currency": "DOP"
  },
  "payment": {
    "method": "wallet",
    "transaction_id": "wl_123456"
  },
  "user": {
    "id": "user_123",
    "phone": "+18091234567"
  }
}
```

**Response (Sync - Confirmado):**

```json
{
  "status": "confirmed",
  "play_id_banca": "BANCA_12345",
  "ticket_code": "TKT-ABC12345",
  "message": "Jugada registrada exitosamente"
}
```

**Response (Async - Pendiente):**

```json
{
  "status": "pending",
  "play_id_banca": "BANCA_12345",
  "message": "Jugada recibida, procesando..."
}
```

#### Endpoint que la Banca debe llamar (Webhook)

**POST /webhooks/plays/confirmation**

La banca envía confirmaciones a Lotolink.

**Headers requeridos:**

| Header | Tipo | Descripción |
|--------|------|-------------|
| `X-Signature` | string | Firma HMAC-SHA256 en Base64 |
| `X-Timestamp` | string | Timestamp ISO-8601 |

**Request Body:**

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "play_id_banca": "BANCA_12345",
  "ticket_code": "TKT-ABC12345",
  "status": "confirmed"
}
```

### 2.5 Autenticación OAuth2

Para obtener un token de acceso:

```http
POST https://auth.lotolink.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&scope=plays:write
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "plays:write"
}
```

### 2.6 Firma HMAC-SHA256

La firma se calcula concatenando:

```
signatureBase = METHOD + PATH + TIMESTAMP + BODY
signature = Base64(HMAC-SHA256(signatureBase, hmacSecret))
```

**Ejemplo:**

```
METHOD    = "POST"
PATH      = "/webhooks/plays/confirmation"
TIMESTAMP = "2025-12-01T20:00:00Z"
BODY      = '{"request_id":"550e8400...","status":"confirmed"}'

signatureBase = "POST/webhooks/plays/confirmation2025-12-01T20:00:00Z{\"request_id\":\"550e8400...\",\"status\":\"confirmed\"}"
```

#### Implementación en Node.js

```javascript
const crypto = require('crypto');

function signRequest(method, path, timestamp, body, secret) {
  const signatureBase = `${method}${path}${timestamp}${body}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signatureBase);
  return hmac.digest('base64');
}

// Ejemplo de uso
const signature = signRequest(
  'POST',
  '/webhooks/plays/confirmation',
  '2025-12-01T20:00:00Z',
  JSON.stringify({ request_id: '550e8400...', status: 'confirmed' }),
  'tu_hmac_secret'
);
```

#### Implementación en PHP

```php
<?php
function signRequest($method, $path, $timestamp, $body, $secret) {
    $signatureBase = $method . $path . $timestamp . $body;
    return base64_encode(hash_hmac('sha256', $signatureBase, $secret, true));
}

// Ejemplo de uso
$signature = signRequest(
    'POST',
    '/webhooks/plays/confirmation',
    '2025-12-01T20:00:00Z',
    json_encode(['request_id' => '550e8400...', 'status' => 'confirmed']),
    'tu_hmac_secret'
);
```

#### Implementación en Java

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

public class HmacSigner {
    public static String signRequest(String method, String path, 
                                      String timestamp, String body, 
                                      String secret) throws Exception {
        String signatureBase = method + path + timestamp + body;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(), "HmacSHA256"));
        byte[] hash = mac.doFinal(signatureBase.getBytes());
        return Base64.getEncoder().encodeToString(hash);
    }
}
```

### 2.7 Manejo de Errores

#### Códigos de Respuesta HTTP

| Código | Significado | Acción Recomendada |
|--------|-------------|-------------------|
| `200` | Éxito | Procesar respuesta |
| `201` | Creado | Recurso creado exitosamente |
| `202` | Aceptado | Procesamiento async iniciado |
| `400` | Bad Request | Verificar payload |
| `401` | No autorizado | Verificar firma/token |
| `404` | No encontrado | Verificar IDs |
| `409` | Conflicto | Solicitud duplicada (idempotencia) |
| `422` | Entidad no procesable | Validar datos |
| `429` | Too Many Requests | Implementar backoff |
| `500` | Error del servidor | Reintentar con backoff |
| `502/503/504` | Error de gateway | Reintentar con backoff |

#### Formato de Error

```json
{
  "statusCode": 400,
  "message": "Invalid numbers format",
  "error": "Bad Request",
  "timestamp": "2025-12-01T20:00:00Z"
}
```

#### Estrategia de Reintentos

```
Intento 1: Inmediato
Intento 2: Esperar 1 segundo
Intento 3: Esperar 2 segundos
Intento 4: Esperar 4 segundos
Intento 5: Esperar 8 segundos
Después: Mover a cola de errores para revisión manual
```

---

## 3. Ejemplos de Código

### 3.1 Node.js - Servidor Completo

```javascript
/**
 * Servidor de integración con Lotolink - Node.js
 * Archivo: banca-server.js
 */

const crypto = require('crypto');
const express = require('express');
const app = express();
app.use(express.json());

// ============================================================
// CONFIGURACIÓN
// ============================================================
const CONFIG = {
  hmacSecret: process.env.LOTOLINK_HMAC_SECRET || 'your_hmac_secret',
  webhookUrl: process.env.LOTOLINK_WEBHOOK_URL || 
              'https://api.lotolink.com/webhooks/plays/confirmation',
};

// ============================================================
// UTILIDADES HMAC
// ============================================================

function signRequest(method, path, timestamp, body) {
  const signatureBase = `${method}${path}${timestamp}${body}`;
  const hmac = crypto.createHmac('sha256', CONFIG.hmacSecret);
  hmac.update(signatureBase);
  return hmac.digest('base64');
}

function verifySignature(method, path, timestamp, body, signature) {
  const expected = signRequest(method, path, timestamp, body);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// ============================================================
// MIDDLEWARE DE VALIDACIÓN
// ============================================================

function validateLotolinkRequest(req, res, next) {
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  
  // Verificar headers
  if (!signature || !timestamp) {
    return res.status(401).json({ 
      error: 'Missing signature or timestamp' 
    });
  }

  // Validar timestamp (±120 segundos)
  const requestTime = new Date(timestamp).getTime();
  const currentTime = Date.now();
  if (Math.abs(currentTime - requestTime) > 120000) {
    return res.status(400).json({ 
      error: 'Timestamp out of range' 
    });
  }

  // Verificar firma
  const body = JSON.stringify(req.body);
  if (!verifySignature(req.method, req.path, timestamp, body, signature)) {
    return res.status(401).json({ 
      error: 'Invalid signature' 
    });
  }

  next();
}

// ============================================================
// ENDPOINT: Recibir jugadas
// ============================================================

app.post('/v1/plays/register', validateLotolinkRequest, async (req, res) => {
  const { request_id, play, payment, user } = req.body;

  console.log(`📥 Nueva jugada: ${request_id}`);
  console.log(`   Lotería: ${play.lottery_id}`);
  console.log(`   Números: ${play.numbers.join(', ')}`);
  console.log(`   Monto: ${play.amount} ${play.currency}`);

  try {
    // 1. Verificar idempotencia
    // TODO: Buscar request_id en tu base de datos
    
    // 2. Validar disponibilidad de números
    // TODO: Verificar en tu sistema
    
    // 3. Registrar jugada
    const bancaPlayId = `BANCA_${Date.now()}`;
    const ticketCode = `TKT-${Math.random().toString(36)
                              .substring(2, 10).toUpperCase()}`;
    
    // 4. Responder a Lotolink
    res.status(200).json({
      status: 'confirmed',
      play_id_banca: bancaPlayId,
      ticket_code: ticketCode,
      message: 'Jugada registrada exitosamente'
    });

    console.log(`✅ Jugada confirmada: ${ticketCode}`);

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del sistema'
    });
  }
});

// ============================================================
// FUNCIÓN: Enviar webhook a Lotolink
// ============================================================

async function sendWebhookConfirmation(requestId, status, ticketCode) {
  const timestamp = new Date().toISOString();
  const path = '/webhooks/plays/confirmation';
  const body = JSON.stringify({
    request_id: requestId,
    play_id_banca: `BANCA_${Date.now()}`,
    status: status,
    ticket_code: ticketCode,
  });

  const signature = signRequest('POST', path, timestamp, body);

  const response = await fetch(CONFIG.webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
      'X-Timestamp': timestamp,
    },
    body: body,
  });

  return response.ok;
}

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🎰 Banca API corriendo en puerto ${PORT}`);
});

module.exports = app;
```

### 3.2 PHP - Clase de Integración Completa

```php
<?php
/**
 * Clase de integración con Lotolink - PHP
 * Archivo: LotolinkIntegration.php
 */

class LotolinkIntegration
{
    private string $hmacSecret;
    private string $webhookUrl;

    public function __construct()
    {
        $this->hmacSecret = getenv('LOTOLINK_HMAC_SECRET') ?: 'your_secret';
        $this->webhookUrl = getenv('LOTOLINK_WEBHOOK_URL') ?: 
            'https://api.lotolink.com/webhooks/plays/confirmation';
    }

    /**
     * Genera firma HMAC-SHA256
     */
    public function signRequest(
        string $method, 
        string $path, 
        string $timestamp, 
        string $body
    ): string {
        $signatureBase = $method . $path . $timestamp . $body;
        return base64_encode(
            hash_hmac('sha256', $signatureBase, $this->hmacSecret, true)
        );
    }

    /**
     * Verifica firma HMAC
     */
    public function verifySignature(
        string $method, 
        string $path, 
        string $timestamp, 
        string $body, 
        string $signature
    ): bool {
        $expected = $this->signRequest($method, $path, $timestamp, $body);
        return hash_equals($expected, $signature);
    }

    /**
     * Valida request de Lotolink
     * @throws Exception
     */
    public function validateRequest(string $method, string $path): array
    {
        $signature = $_SERVER['HTTP_X_SIGNATURE'] ?? null;
        $timestamp = $_SERVER['HTTP_X_TIMESTAMP'] ?? null;

        if (!$signature || !$timestamp) {
            throw new Exception('Missing signature or timestamp', 401);
        }

        // Validar timestamp (±120 segundos)
        $requestTime = strtotime($timestamp);
        if (abs(time() - $requestTime) > 120) {
            throw new Exception('Timestamp out of range', 400);
        }

        // Verificar firma
        $body = file_get_contents('php://input');
        if (!$this->verifySignature($method, $path, $timestamp, $body, $signature)) {
            throw new Exception('Invalid signature', 401);
        }

        return json_decode($body, true);
    }

    /**
     * Envía confirmación a Lotolink
     */
    public function sendConfirmation(
        string $requestId,
        string $status,
        ?string $ticketCode = null
    ): bool {
        $timestamp = gmdate('Y-m-d\TH:i:s\Z');
        $path = '/webhooks/plays/confirmation';

        $body = json_encode([
            'request_id' => $requestId,
            'play_id_banca' => 'BANCA_' . time(),
            'status' => $status,
            'ticket_code' => $ticketCode,
        ]);

        $signature = $this->signRequest('POST', $path, $timestamp, $body);

        $ch = curl_init($this->webhookUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-Signature: ' . $signature,
                'X-Timestamp: ' . $timestamp,
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $httpCode === 200;
    }
}

// ============================================================
// CONTROLADOR DE EJEMPLO
// ============================================================

class PlayController
{
    private LotolinkIntegration $lotolink;

    public function __construct()
    {
        $this->lotolink = new LotolinkIntegration();
    }

    public function register(): void
    {
        header('Content-Type: application/json');

        try {
            $data = $this->lotolink->validateRequest(
                'POST', 
                '/v1/plays/register'
            );

            $requestId = $data['request_id'];
            $play = $data['play'];

            // Procesar jugada...
            $ticketCode = 'TKT-' . strtoupper(substr(md5(uniqid()), 0, 8));

            http_response_code(200);
            echo json_encode([
                'status' => 'confirmed',
                'play_id_banca' => 'BANCA_' . time(),
                'ticket_code' => $ticketCode,
            ]);

        } catch (Exception $e) {
            http_response_code($e->getCode() ?: 500);
            echo json_encode([
                'status' => 'error',
                'message' => $e->getMessage()
            ]);
        }
    }
}
```

### 3.3 Java - Integración con Spring Boot

```java
package com.lotolink.banca;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.security.MessageDigest;

/**
 * Clase de integración con Lotolink - Java 11+
 */
public class LotolinkIntegration {

    private final String hmacSecret;
    private final String webhookUrl;
    private final HttpClient httpClient;

    public LotolinkIntegration() {
        this.hmacSecret = System.getenv("LOTOLINK_HMAC_SECRET");
        this.webhookUrl = System.getenv("LOTOLINK_WEBHOOK_URL");
        this.httpClient = HttpClient.newHttpClient();
    }

    /**
     * Genera firma HMAC-SHA256
     */
    public String signRequest(String method, String path, 
                              String timestamp, String body) throws Exception {
        String signatureBase = method + path + timestamp + body;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(hmacSecret.getBytes(), "HmacSHA256"));
        byte[] hash = mac.doFinal(signatureBase.getBytes());
        return Base64.getEncoder().encodeToString(hash);
    }

    /**
     * Verifica firma HMAC
     */
    public boolean verifySignature(String method, String path, 
                                   String timestamp, String body, 
                                   String signature) {
        try {
            String expected = signRequest(method, path, timestamp, body);
            return MessageDigest.isEqual(
                expected.getBytes(), 
                signature.getBytes()
            );
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Valida timestamp (±120 segundos)
     */
    public boolean validateTimestamp(String timestamp) {
        try {
            Instant requestTime = Instant.parse(timestamp);
            long diff = Math.abs(
                ChronoUnit.SECONDS.between(requestTime, Instant.now())
            );
            return diff <= 120;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Envía confirmación a Lotolink
     */
    public boolean sendConfirmation(String requestId, String status, 
                                    String ticketCode) {
        try {
            String timestamp = Instant.now().toString();
            String path = "/webhooks/plays/confirmation";
            
            String body = String.format(
                "{\"request_id\":\"%s\",\"play_id_banca\":\"BANCA_%d\"," +
                "\"status\":\"%s\",\"ticket_code\":\"%s\"}",
                requestId, System.currentTimeMillis(), status, ticketCode
            );
            
            String signature = signRequest("POST", path, timestamp, body);
            
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(webhookUrl))
                .header("Content-Type", "application/json")
                .header("X-Signature", signature)
                .header("X-Timestamp", timestamp)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
            
            HttpResponse<String> response = httpClient.send(
                request, 
                HttpResponse.BodyHandlers.ofString()
            );
            
            return response.statusCode() == 200;
            
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            return false;
        }
    }
}

// ============================================================
// CONTROLADOR SPRING BOOT
// ============================================================

/*
@RestController
@RequestMapping("/v1/plays")
public class PlayController {

    private final LotolinkIntegration lotolink = new LotolinkIntegration();

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestHeader("X-Signature") String signature,
            @RequestHeader("X-Timestamp") String timestamp,
            @RequestBody String body) {
        
        // 1. Validar timestamp
        if (!lotolink.validateTimestamp(timestamp)) {
            return ResponseEntity.status(400)
                .body(Map.of("error", "Timestamp out of range"));
        }

        // 2. Verificar firma
        if (!lotolink.verifySignature("POST", "/v1/plays/register", 
                                       timestamp, body, signature)) {
            return ResponseEntity.status(401)
                .body(Map.of("error", "Invalid signature"));
        }

        // 3. Procesar jugada
        String ticketCode = "TKT-" + UUID.randomUUID().toString()
                                        .substring(0, 8).toUpperCase();

        // 4. Responder
        return ResponseEntity.ok(Map.of(
            "status", "confirmed",
            "play_id_banca", "BANCA_" + System.currentTimeMillis(),
            "ticket_code", ticketCode
        ));
    }
}
*/
```

---

## 4. Webhooks

### 4.1 Recibir Webhooks de Lotolink

Lotolink puede enviar webhooks a tu sistema para notificar eventos. Debes implementar un endpoint HTTPS que:

1. Valide la firma HMAC del header `X-Signature`
2. Valide el timestamp del header `X-Timestamp`
3. Procese el evento
4. Responda con `200 OK`

### 4.2 Enviar Webhooks a Lotolink

Para confirmar jugadas de forma asíncrona:

**Endpoint:** `POST https://api.lotolink.com/webhooks/plays/confirmation`

**Headers requeridos:**

```http
Content-Type: application/json
X-Signature: <firma_hmac_base64>
X-Timestamp: <timestamp_iso8601>
```

**Body:**

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "play_id_banca": "BANCA_12345",
  "ticket_code": "TKT-ABC12345",
  "status": "confirmed"
}
```

### 4.3 Validación de Firmas

**Algoritmo:**

1. Concatenar: `METHOD + PATH + TIMESTAMP + BODY`
2. Calcular HMAC-SHA256 con el secreto compartido
3. Codificar en Base64
4. Comparar con el header `X-Signature`

**Ejemplo de validación:**

```javascript
function validateWebhook(req) {
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  const body = JSON.stringify(req.body);
  
  // Calcular firma esperada
  const expected = signRequest('POST', req.path, timestamp, body);
  
  // Comparar de forma segura (timing-safe)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### 4.4 Replay Protection

Para prevenir ataques de replay:

1. **Validar timestamp:** Rechazar requests con timestamp fuera de ±120 segundos
2. **Almacenar request_id:** Guardar request_ids procesados para detectar duplicados
3. **Usar idempotencia:** Responder igual para requests duplicados

```javascript
function isValidTimestamp(timestamp) {
  const requestTime = new Date(timestamp).getTime();
  const currentTime = Date.now();
  return Math.abs(currentTime - requestTime) <= 120000; // 120 segundos
}
```

### 4.5 Reintentos y Manejo de Errores

Lotolink reintenta webhooks fallidos con backoff exponencial:

| Intento | Espera |
|---------|--------|
| 1 | Inmediato |
| 2 | 1 segundo |
| 3 | 5 segundos |
| 4 | 30 segundos |
| 5 | 5 minutos |

**Recomendaciones:**

- Responder `200 OK` rápidamente
- Procesar lógica pesada de forma asíncrona
- Implementar idempotencia para manejar reintentos

---

## 5. Testing

### 5.1 Usar el Mock Banca

El repositorio incluye un servicio mock para testing:

```bash
cd mock-banca
npm install
npm start  # Puerto 4000
```

**Endpoints disponibles:**

| Endpoint | Descripción |
|----------|-------------|
| `GET /health` | Health check |
| `POST /v1/plays/register` | Registrar jugada (simula respuesta) |
| `POST /admin/reset` | Reiniciar estado |
| `POST /admin/config` | Configurar comportamiento |

**Configurar comportamiento:**

```bash
curl -X POST http://localhost:4000/admin/config \
  -H "Content-Type: application/json" \
  -d '{"syncResponseRate": 1.0, "confirmRate": 1.0}'
```

### 5.2 Ambiente de Staging

**URLs de staging:**

| Servicio | URL |
|----------|-----|
| API | `https://staging-api.lotolink.com` |
| Auth | `https://staging-auth.lotolink.com` |
| Webhooks | `https://staging-api.lotolink.com/webhooks` |

**Credenciales de prueba:**

Solicitar al equipo de integraciones: integraciones@lotolink.com

### 5.3 Checklist de Validación

#### Pre-Producción

- [ ] Endpoint `/v1/plays/register` implementado y accesible
- [ ] Validación de firma HMAC funcionando
- [ ] Validación de timestamp funcionando (±120s)
- [ ] Respuestas en formato JSON correcto
- [ ] Idempotencia implementada (mismo request_id = misma respuesta)
- [ ] Manejo de errores con códigos HTTP apropiados

#### Webhooks

- [ ] Endpoint de webhook configurado en Lotolink
- [ ] Generación de firma HMAC correcta
- [ ] Timestamp en formato ISO-8601
- [ ] Reintentos implementados para errores temporales

#### Seguridad

- [ ] HTTPS con certificado válido
- [ ] Secreto HMAC almacenado de forma segura
- [ ] Logs sin información sensible
- [ ] Rate limiting implementado

---

## 6. App White-Label (Alternativa)

### 6.1 ¿Para Quién Es?

La app white-label es ideal para bancas que:

- No tienen sistema digital propio
- Desean modernizar su operación rápidamente
- Prefieren una solución llave en mano
- Tienen personal que puede usar smartphones/tablets

### 6.2 Proceso de Instalación

**Paso 1: Registro (5 minutos)**

Proporcionar a Lotolink:
- Nombre de la banca
- RNC / Identificación fiscal
- Dirección física
- Teléfono de contacto
- Email del administrador

**Paso 2: Recibir Credenciales (1 minuto)**

Lotolink envía por email/WhatsApp:
```
¡Bienvenido a Lotolink! 🎰

Descarga la app de vendedor:
📱 Android: https://play.google.com/store/apps/details?id=com.lotolink.banca

Credenciales:
Usuario: banca_[codigo]
Contraseña: [temporal]

Soporte: soporte@lotolink.com
```

**Paso 3: Configuración (10 minutos)**

1. Descargar la app desde Play Store
2. Ingresar credenciales
3. Cambiar contraseña temporal
4. Configurar impresora térmica (opcional)
5. Realizar jugada de prueba

### 6.3 Funcionalidades

| Función | Descripción |
|---------|-------------|
| **Cola de jugadas** | Ver jugadas pendientes en tiempo real |
| **Aceptar/Rechazar** | Confirmar o rechazar jugadas |
| **Imprimir tickets** | Conectar impresora Bluetooth |
| **Historial** | Ver jugadas procesadas |
| **Reportes** | Estadísticas diarias/mensuales |
| **Notificaciones** | Alertas de nuevas jugadas |

---

## 7. FAQ - Preguntas Frecuentes

### Técnicas

**P: ¿Qué hacer si la firma HMAC no coincide?**

R: Verificar:
1. El secreto HMAC es correcto
2. El orden de concatenación es: METHOD + PATH + TIMESTAMP + BODY
3. El body es exactamente el JSON enviado (sin espacios extra)
4. La codificación es Base64 (no hex)

**P: ¿Cómo manejar jugadas duplicadas?**

R: Implementar idempotencia:
1. Almacenar el `request_id` de cada jugada procesada
2. Si llega un request con el mismo ID, retornar la respuesta original
3. Usar respuesta `409 Conflict` si el ID existe pero con datos diferentes

**P: ¿Qué timeout debo configurar?**

R: Recomendamos:
- Conexión: 10 segundos
- Lectura: 30 segundos
- Total: 60 segundos

**P: ¿Cómo probar webhooks localmente?**

R: Usar herramientas como ngrok:
```bash
ngrok http 4000
# Configurar la URL https de ngrok en Lotolink
```

**P: ¿Se puede usar HTTP en lugar de HTTPS?**

R: No en producción. HTTPS es obligatorio para seguridad. En desarrollo local puedes usar HTTP.

### Operativas

**P: ¿Cuánto tiempo tengo para confirmar una jugada?**

R: Máximo 5 minutos. Después de ese tiempo, la jugada se marca como fallida y se reembolsa al usuario.

**P: ¿Qué pasa si mi sistema está caído?**

R: Lotolink reintenta hasta 5 veces con backoff exponencial. Si todos los intentos fallan, la jugada se cancela y el usuario recibe un reembolso.

**P: ¿Puedo rechazar una jugada?**

R: Sí, responde con `status: "rejected"` y una razón. El usuario será notificado y reembolsado.

---

## 8. Contacto y Soporte

### Canales de Soporte

| Canal | Contacto | Horario |
|-------|----------|---------|
| **Email Técnico** | integraciones@lotolink.com | 24/7 |
| **WhatsApp Soporte** | +1 (809) XXX-XXXX | Lun-Vie 8am-6pm |
| **Documentación** | https://docs.lotolink.com | 24/7 |
| **Status Page** | https://status.lotolink.com | 24/7 |

### SLA de Respuesta

| Prioridad | Descripción | Tiempo de Respuesta |
|-----------|-------------|---------------------|
| **Crítica** | Sistema caído, pérdida de transacciones | 1 hora |
| **Alta** | Funcionalidad degradada | 4 horas |
| **Media** | Problema que tiene workaround | 24 horas |
| **Baja** | Consulta, mejora sugerida | 72 horas |

### Proceso de Escalamiento

1. Abrir ticket vía email con asunto: `[PRIORIDAD] Descripción breve`
2. Incluir: request_ids afectados, timestamps, logs relevantes
3. Esperar confirmación de recepción
4. Si no hay respuesta en SLA, escalar a: escalaciones@lotolink.com

---

## Apéndices

### Apéndice A: Especificación OpenAPI

La especificación completa de la API está disponible en:

- **Archivo:** `docs/openapi.yaml`
- **URL:** https://api.lotolink.com/docs

Puede importarse en herramientas como Swagger UI, Postman, o generadores de código.

### Apéndice B: Códigos de Error

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `E001` | `INVALID_SIGNATURE` | Firma HMAC inválida |
| `E002` | `TIMESTAMP_EXPIRED` | Timestamp fuera de rango |
| `E003` | `DUPLICATE_REQUEST` | request_id ya procesado |
| `E004` | `INVALID_LOTTERY` | Lotería no válida o cerrada |
| `E005` | `NUMBERS_UNAVAILABLE` | Números no disponibles |
| `E006` | `AMOUNT_BELOW_MIN` | Monto menor al mínimo |
| `E007` | `AMOUNT_ABOVE_MAX` | Monto mayor al máximo |
| `E008` | `INSUFFICIENT_FUNDS` | Fondos insuficientes |
| `E009` | `USER_BLOCKED` | Usuario bloqueado |
| `E010` | `BANCA_OFFLINE` | Banca no disponible |

### Apéndice C: Glosario de Términos

| Término | Definición |
|---------|------------|
| **Banca** | Establecimiento que procesa y registra jugadas de lotería |
| **Jugada** | Apuesta realizada por un usuario en una lotería |
| **Play** | Sinónimo de jugada en el contexto de la API |
| **Ticket** | Comprobante de una jugada confirmada |
| **Webhook** | Notificación HTTP enviada cuando ocurre un evento |
| **HMAC** | Hash-based Message Authentication Code |
| **Idempotencia** | Propiedad que permite repetir una operación sin efectos adicionales |
| **request_id** | Identificador único de una solicitud |
| **play_id_banca** | Identificador de la jugada en el sistema de la banca |
| **Quiniela** | Tipo de apuesta de 2 números |
| **Palé** | Tipo de apuesta de 3 números |
| **Tripleta** | Tipo de apuesta de 4+ números |

---

**Fin del documento**

*Lotolink © 2025 - Todos los derechos reservados*
