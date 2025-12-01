# Ejemplos de Integración Lotolink

Este directorio contiene ejemplos de código para integrar sistemas de bancas con Lotolink.

## Archivos

| Archivo | Lenguaje | Descripción |
|---------|----------|-------------|
| `banca-integration-nodejs.js` | Node.js | Servidor Express con endpoints y webhooks |
| `banca-integration-php.php` | PHP 7.4+ | Clase de integración y controlador |
| `LotolinkIntegration.java` | Java 11+ | Clase utilitaria con ejemplo Spring Boot |

## Uso Rápido

### Node.js

```bash
# Instalar dependencias
npm install express

# Configurar variables de entorno
export LOTOLINK_HMAC_SECRET="tu_secreto_aqui"
export LOTOLINK_WEBHOOK_URL="https://api.lotolink.com/webhooks/plays/confirmation"

# Ejecutar
node banca-integration-nodejs.js
```

### PHP

```bash
# Configurar variables de entorno
export LOTOLINK_HMAC_SECRET="tu_secreto_aqui"
export LOTOLINK_WEBHOOK_URL="https://api.lotolink.com/webhooks/plays/confirmation"

# Ejecutar servidor de prueba
php -S localhost:4000
```

### Java

```bash
# Configurar variables de entorno
export LOTOLINK_HMAC_SECRET="tu_secreto_aqui"
export LOTOLINK_WEBHOOK_URL="https://api.lotolink.com/webhooks/plays/confirmation"

# Compilar y ejecutar
javac LotolinkIntegration.java
java LotolinkIntegration
```

## Flujo de Integración

```
1. Lotolink envía POST /v1/plays/register a tu sistema
2. Tu sistema valida la firma HMAC
3. Tu sistema procesa la jugada
4. Tu sistema responde con status "pending"
5. Tu sistema envía POST /webhooks/plays/confirmation a Lotolink
6. Lotolink notifica al usuario
```

## Credenciales Requeridas

Solicitar a Lotolink:

- `LOTOLINK_CLIENT_ID` - Identificador de tu banca
- `LOTOLINK_CLIENT_SECRET` - Secreto para OAuth2
- `LOTOLINK_HMAC_SECRET` - Clave para firmar webhooks

## Soporte

- Email: integraciones@lotolink.com
- Documentación: https://docs.lotolink.com
