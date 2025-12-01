# Guía de Integración para Bancas - Lotolink

## Resumen

Este documento describe las dos opciones para integrar una banca con Lotolink:

| Opción | Descripción | Ideal para | Tiempo de integración |
|--------|-------------|------------|----------------------|
| **A) API Directa** | La banca conecta su sistema a Lotolink via API | Bancas con software propio (Softlot, GigaSoft, RS Systems, Vidicom) | 1-2 semanas |
| **B) App White-Label** | La banca usa la app POS de Lotolink | Bancas sin sistema digital o que quieren modernizar | 1 día (remoto) |

---

## Opción A: Integración API Directa

### ¿Para quién es?

Para bancas que ya tienen un sistema de software (proveedores como Softlot, GigaSoft, RS Systems, Vidicom, etc.). El proveedor integra **una sola vez** y todas las bancas que usan ese software quedan conectadas automáticamente.

### Paquete Técnico de Integración

#### 1. Especificación API (OpenAPI 3.0)

El archivo completo está en: [`docs/openapi.yaml`](./openapi.yaml)

**Endpoints principales:**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/v1/plays` | Registrar una jugada |
| `GET` | `/api/v1/plays/{play_id}` | Consultar estado de jugada |
| `POST` | `/webhooks/plays/confirmation` | Confirmar/rechazar jugada (webhook) |

#### 2. Autenticación

**Para registrar jugadas (Lotolink → Banca):**
- OAuth2 Client Credentials
- Token URL: `https://auth.lotolink.com/oauth/token`
- Scope: `plays:write`

**Para webhooks (Banca → Lotolink):**
- HMAC-SHA256 en header `X-Signature`
- Timestamp en header `X-Timestamp` (ISO-8601)
- Replay protection: ±120 segundos

#### 3. Ejemplo de Firma HMAC

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
  JSON.stringify({ play_id_banca: 'ABC123', status: 'confirmed' }),
  'tu_hmac_secret_aqui'
);

// Enviar request con headers:
// X-Signature: <signature>
// X-Timestamp: 2025-12-01T20:00:00Z
```

```php
<?php
// PHP Example
function signRequest($method, $path, $timestamp, $body, $secret) {
    $signatureBase = $method . $path . $timestamp . $body;
    return base64_encode(hash_hmac('sha256', $signatureBase, $secret, true));
}

$signature = signRequest(
    'POST',
    '/webhooks/plays/confirmation',
    '2025-12-01T20:00:00Z',
    json_encode(['play_id_banca' => 'ABC123', 'status' => 'confirmed']),
    'tu_hmac_secret_aqui'
);
?>
```

```java
// Java Example
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

public class HmacSigner {
    public static String signRequest(String method, String path, String timestamp, String body, String secret) throws Exception {
        String signatureBase = method + path + timestamp + body;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(), "HmacSHA256"));
        byte[] hash = mac.doFinal(signatureBase.getBytes());
        return Base64.getEncoder().encodeToString(hash);
    }
}
```

#### 4. Flujo de Integración

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Usuario   │         │   Lotolink  │         │    Banca    │
│    (App)    │         │  (Backend)  │         │  (Sistema)  │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  1. Selecciona jugada │                       │
       │──────────────────────>│                       │
       │                       │                       │
       │                       │  2. POST /v1/plays    │
       │                       │──────────────────────>│
       │                       │                       │
       │                       │  3. {status: pending} │
       │                       │<──────────────────────│
       │                       │                       │
       │  4. "Procesando..."   │                       │
       │<──────────────────────│                       │
       │                       │                       │
       │                       │  5. POST /webhooks    │
       │                       │     /confirmation     │
       │                       │<──────────────────────│
       │                       │                       │
       │  6. "¡Confirmado!"    │                       │
       │<──────────────────────│                       │
       │                       │                       │
```

#### 5. Credenciales por Banca

Cada banca recibe:

| Credential | Descripción |
|------------|-------------|
| `client_id` | Identificador único de la banca |
| `client_secret` | Secreto para OAuth2 |
| `hmac_secret` | Clave para firmar webhooks |
| `webhook_url` | URL para recibir confirmaciones |

---

## Opción B: App White-Label (POS Lotolink)

### ¿Para quién es?

Para bancas que:
- No tienen sistema digital
- Quieren modernizar su operación
- Prefieren usar una solución lista

### Instalación Remota (Recomendada)

**No requiere visita presencial.** La banca instala la app desde un enlace.

#### Proceso:

1. **Registro de la banca** (5 minutos)
   - La banca proporciona: nombre, RNC, dirección, teléfono
   - Lotolink genera credenciales y activa la cuenta

2. **Envío del enlace** (1 minuto)
   - Enviar por WhatsApp/email:
   ```
   ¡Bienvenido a Lotolink! 🎰
   
   Descarga la app de vendedor aquí:
   📱 Android: https://play.google.com/store/apps/details?id=com.lotolink.banca
   
   Tus credenciales:
   Usuario: banca_[codigo]
   Contraseña: [temporal]
   
   ¿Dudas? Escríbenos: soporte@lotolink.com
   ```

3. **La banca instala y configura** (10 minutos)
   - Descarga la app
   - Ingresa credenciales
   - Configura impresora térmica (opcional)
   - ¡Listo para operar!

### Instalación Presencial (Casos especiales)

Solo necesaria para:
- Bancas muy grandes (330+ sucursales)
- Dueños que no manejan tecnología
- Sistemas legacy que requieren integración especial

**Proceso:**
1. Coordinar visita con la banca
2. Llevar tablet/celular con app preinstalada
3. Configurar WiFi e impresora
4. Capacitar al personal (30 min)
5. Dejar material de soporte impreso

---

## Recursos Adicionales

### Contacto de Soporte Técnico

| Canal | Contacto |
|-------|----------|
| Email | integraciones@lotolink.com |
| WhatsApp Técnico | +1 (809) XXX-XXXX |
| Documentación API | https://docs.lotolink.com |

### Archivos del Paquete de Integración

- [`docs/openapi.yaml`](./openapi.yaml) - Especificación API completa
- [`backend/src/infrastructure/adapters/`](../backend/src/infrastructure/adapters/) - Código de referencia
- [`backend/database/migrations/`](../backend/database/migrations/) - Esquema de base de datos

### Checklist de Integración API

- [ ] Recibir credenciales (`client_id`, `client_secret`, `hmac_secret`)
- [ ] Implementar autenticación OAuth2
- [ ] Implementar endpoint para recibir jugadas
- [ ] Implementar firma HMAC para webhooks
- [ ] Probar en ambiente staging
- [ ] Certificar con Lotolink
- [ ] Activar en producción

### Checklist de App White-Label

- [ ] Registrar banca en sistema Lotolink
- [ ] Enviar credenciales a la banca
- [ ] Confirmar instalación de la app
- [ ] Verificar primera transacción de prueba
- [ ] Activar para operación real
