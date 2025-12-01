# Guía de Pruebas - Lotolink

Esta guía te muestra cómo probar que todo el sistema Lotolink funciona correctamente.

## Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Opción 1: Pruebas Rápidas (sin Docker)](#opción-1-pruebas-rápidas-sin-docker)
3. [Opción 2: Pruebas Completas (con Docker)](#opción-2-pruebas-completas-con-docker)
4. [Pruebas del Frontend (PWA)](#pruebas-del-frontend-pwa)
5. [Pruebas de la API](#pruebas-de-la-api)
6. [Pruebas de Integración con Bancas](#pruebas-de-integración-con-bancas)

---

## Requisitos Previos

### Para pruebas sin Docker:
- Node.js 18+
- npm o yarn

### Para pruebas completas:
- Docker y Docker Compose
- Node.js 18+

---

## Opción 1: Pruebas Rápidas (sin Docker)

### 1.1 Ejecutar Tests Unitarios del Backend

```bash
# Ir al directorio del backend
cd backend

# Instalar dependencias
npm install

# Ejecutar tests
npm test

# Ejecutar tests con cobertura
npm run test:cov
```

**Resultado esperado:** 76 tests pasando ✅

Los tests incluyen:
- Tests unitarios de entidades (Play, User)
- Tests de integración de servicios (PlayService, UserService, WebhookService)
- Tests del controlador de autenticación (AuthController)
- Tests del adaptador de banca mock (MockBancaAdapter)
- Tests del logger estructurado (StructuredLogger)

### 1.2 Verificar que el código compila

```bash
cd backend
npm run build
```

**Resultado esperado:** Sin errores de TypeScript ✅

### 1.3 Ejecutar linter

```bash
cd backend
npm run lint
```

**Resultado esperado:** Sin errores de ESLint ✅

---

## Opción 2: Pruebas Completas (con Docker)

### 2.1 Levantar todos los servicios

```bash
# Desde la raíz del proyecto
docker-compose up -d

# Ver logs
docker-compose logs -f backend
```

### 2.2 Verificar que todos los servicios están corriendo

```bash
docker-compose ps
```

**Resultado esperado:**
| Servicio | Puerto | Estado |
|----------|--------|--------|
| lotolink-postgres | 5432 | healthy |
| lotolink-redis | 6379 | healthy |
| lotolink-rabbitmq | 5672, 15672 | healthy |
| lotolink-backend | 3000 | running |
| lotolink-adminer | 8080 | running |

### 2.3 Probar la API

```bash
# Health check
curl http://localhost:3000/health

# Respuesta esperada: {"status":"ok"}
```

### 2.4 Acceder a las UIs

- **API Backend:** http://localhost:3000
- **Adminer (DB):** http://localhost:8080
  - Sistema: PostgreSQL
  - Servidor: postgres
  - Usuario: lotolink
  - Contraseña: lotolink_dev_password
  - Base de datos: lotolink_db
- **RabbitMQ:** http://localhost:15672
  - Usuario: lotolink
  - Contraseña: lotolink_dev_password

### 2.5 Detener los servicios

```bash
docker-compose down

# Para eliminar también los datos:
docker-compose down -v
```

---

## Pruebas del Frontend (PWA)

### 3.1 Abrir el archivo HTML directamente

```bash
# Opción 1: Doble clic en index.html

# Opción 2: Usar un servidor local
npx serve .

# Opción 3: Usar Python
python3 -m http.server 8000
```

Abre http://localhost:8000 en tu navegador.

### 3.2 Verificar funcionalidades del frontend

| Funcionalidad | Cómo probar | Resultado esperado |
|---------------|-------------|-------------------|
| **PWA** | Abrir en Chrome, ver icono de instalación | Se puede instalar como app |
| **Logo** | Verificar que aparece el logo | Logo visible en header |
| **Selección de lotería** | Click en "Jugar" | Aparece modal con loterías |
| **Carrito** | Agregar números | Se muestra en el carrito |
| **Ticket QR** | Completar compra (mock) | Genera QR del ticket |
| **Portal Banca** | Ir a sección de bancas | Login y dashboard visibles |
| **Responsive** | Cambiar tamaño ventana | Se adapta a móvil/tablet |

### 3.3 Pruebas en dispositivo móvil

1. Subir `index.html` y `lotolink-logo.png` a GitHub Pages o Netlify
2. Abrir URL en móvil
3. Verificar que se puede instalar como PWA
4. Verificar que la UI es usable en pantalla pequeña

---

## Pruebas de la API

### 4.1 Autenticación (obtener token)

```bash
# Registrar usuario (si la ruta existe)
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'

# Guardar el token devuelto para las siguientes pruebas
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 4.2 Crear una jugada

```bash
curl -X POST http://localhost:3000/api/v1/plays \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "request_id": "'$(uuidgen)'",
    "lottery_id": "LEIDSA",
    "modality": "Quiniela",
    "numbers": ["08", "15", "23"],
    "amount": 50.00,
    "currency": "DOP",
    "banca_id": "banca-001"
  }'
```

**Respuesta esperada:**
```json
{
  "play_id": "play-uuid-xxx",
  "status": "pending",
  "estimated_confirmation": "2025-12-01T20:00:00Z"
}
```

### 4.3 Consultar estado de jugada

```bash
curl http://localhost:3000/api/v1/plays/play-uuid-xxx \
  -H "Authorization: Bearer $TOKEN"
```

### 4.4 Simular webhook de confirmación (como banca)

```bash
# Generar firma HMAC
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BODY='{"play_id_banca":"BANCA-123","request_id":"xxx","status":"confirmed","ticket_code":"TKT-001"}'
SIGNATURE=$(echo -n "$TIMESTAMP.$BODY" | openssl dgst -sha256 -hmac "dev_hmac_secret_change_in_production" -hex | cut -d' ' -f2)

curl -X POST http://localhost:3000/webhooks/plays/confirmation \
  -H "Content-Type: application/json" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-Signature: $SIGNATURE" \
  -d "$BODY"
```

---

## Pruebas de Integración con Bancas

### 5.1 Usar el Mock Banca

El repositorio incluye un mock de banca para pruebas:

```bash
cd mock-banca
npm install
npm start
```

El mock simula:
- Recibir jugadas de Lotolink
- Validar firma HMAC
- Responder con confirmación/rechazo
- Enviar webhook de vuelta

### 5.2 Probar con los ejemplos de integración

```bash
# Probar ejemplo Node.js
cd docs/integration-examples
node banca-integration-nodejs.js

# El servidor arranca en puerto 4000
# Envía una jugada de prueba desde Lotolink a localhost:4000
```

---

## Checklist de Pruebas

### ✅ Backend
- [ ] Tests pasan (76/76)
  - Tests unitarios de entidades
  - Tests de integración de servicios
  - Tests del controlador de autenticación
  - Tests del adaptador de banca
  - Tests del logger estructurado
- [ ] Código compila sin errores
- [ ] Linter pasa sin errores
- [ ] Docker Compose levanta todos los servicios
- [ ] API responde en puerto 3000
- [ ] Base de datos accesible vía Adminer
- [ ] Autenticación funciona (register/login/refresh)

### ✅ Frontend
- [ ] index.html carga correctamente
- [ ] Logo visible
- [ ] Navegación funciona
- [ ] Modal de jugar abre
- [ ] Carrito funciona
- [ ] PWA instalable en móvil

### ✅ Integración
- [ ] Crear jugada vía API
- [ ] Consultar estado de jugada
- [ ] Webhook de confirmación funciona
- [ ] Mock banca recibe jugadas

---

## Solución de Problemas

### "No puedo conectar a la base de datos"
```bash
# Verificar que PostgreSQL está corriendo
docker-compose ps postgres

# Ver logs
docker-compose logs postgres
```

### "El backend no arranca"
```bash
# Ver logs del backend
docker-compose logs -f backend

# Verificar dependencias
cd backend && npm install
```

### "Los logos no se ven"
- Verificar que `lotolink-logo.png` está en la misma carpeta que `index.html`
- Si usas un servidor, verificar la ruta relativa

### "Error de CORS"
- El backend debe configurar CORS para permitir el origen del frontend
- Para desarrollo local, usar la misma URL base

---

## Siguiente Paso

Una vez que todas las pruebas pasan, el sistema está listo para:
1. Configurar credenciales de Stripe (producción)
2. Conectar con bancas reales
3. Desplegar en un servidor de producción

Consulta [BANCA_INTEGRATION_GUIDE.md](BANCA_INTEGRATION_GUIDE.md) para integrar bancas.
