# LOTLINK
Loto App development

## AI Virtual Assistant Integration

LotoLink incorpora a **Luna**, una asistente virtual IA integral que mejora la experiencia del usuario a través de la aplicación.

### Características del Asistente IA

#### 1. Integración del Modelo de Lenguaje (LLM)
- **Arquitectura lista para GPT-5**: La aplicación está preparada para integrarse con modelos de lenguaje avanzados
- **Instrucciones personalizadas**: El modelo está configurado para guiar al usuario en cada etapa del juego de lotería
- **Respuestas naturales y coherentes**: Genera respuestas variadas y contextuales

#### 2. Síntesis de Voz (TTS)
- **Voces configurables**: Masculina o femenina
- **Múltiples acentos**: Español (España, México, Dominicano, Argentina, Colombia)
- **Velocidad ajustable**: Lenta, normal o rápida
- **Control de volumen**: Ajustable según preferencia del usuario

#### 3. Interacción Fluida y Contexto
- **Memoria conversacional**: Mantiene el contexto de hasta 20 mensajes
- **Reconocimiento de intención**: Interpreta comandos naturales del usuario
- **Guía paso a paso**: Desde la selección de banca hasta los números finales

#### 4. Flujo de Interacción
1. **Bienvenida**: Luna saluda al usuario al abrir la app
2. **Selección de Banca**: Guía para elegir la sucursal
3. **Selección de Lotería**: Ayuda a elegir entre Leidsa, Loteka, La Primera, etc.
4. **Tipo de Juego**: Explica Quiniela, Palé, Tripleta
5. **Selección de Números**: Acepta números por voz o escritura

#### 5. Configuración de API (Para Producción)

```javascript
// Configuración en AI_CONFIG:
{
  LLM_ENDPOINT: '/api/ai/chat',     // Endpoint del servidor LLM
  LLM_MODEL: 'gpt-5',               // Modelo a utilizar
  TTS_PROVIDER: 'google_wavenet',   // Proveedor TTS
  API_TIMEOUT_MS: 10000,            // Timeout de solicitudes
  ENCRYPTION_ENABLED: true          // Encriptación de datos
}
```

### Privacidad y Seguridad
- **Anonimización de datos**: Opción para no almacenar datos personales
- **Sin registro de conversaciones**: Por defecto no se guardan conversaciones
- **Encriptación**: Comunicaciones seguras con el servidor

### Comandos de Voz Soportados
- "Quiero jugar" - Inicia flujo guiado
- "Ayuda" - Muestra opciones disponibles
- "Perfil" / "Mi cuenta" - Navega al perfil
- "Bancas" / "Sucursales" - Muestra bancas cercanas
- "Loterías" - Lista todas las loterías
- "Cobrar premio" - Ir a sección de cobros
- "Cancelar" - Reinicia la selección
