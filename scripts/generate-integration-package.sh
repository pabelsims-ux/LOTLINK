#!/bin/bash
# =============================================================================
# Lotolink - Generate Integration Package
# =============================================================================
# This script generates a ZIP package containing all integration artifacts
# for distribution to banca software providers (Softlot, GigaSoft, RS Systems,
# Vidicom, etc.) and bancas directly.
#
# Usage: ./scripts/generate-integration-package.sh [output_dir]
#
# Output: lotolink-integration-package-v1.0.zip
# =============================================================================

set -e

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="${1:-$PROJECT_ROOT}"
PACKAGE_NAME="lotolink-integration-package-v1.0"
TEMP_DIR=$(mktemp -d)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_step() {
    echo -e "  ${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "  ${RED}✗${NC} $1"
}

cleanup() {
    rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

# =============================================================================
# MAIN SCRIPT
# =============================================================================

print_header "Lotolink Integration Package Generator"

echo ""
echo "  Project root: $PROJECT_ROOT"
echo "  Output directory: $OUTPUT_DIR"
echo "  Package name: $PACKAGE_NAME.zip"
echo ""

# Create package directory structure
PACKAGE_DIR="$TEMP_DIR/$PACKAGE_NAME"
mkdir -p "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR/docs"
mkdir -p "$PACKAGE_DIR/examples"
mkdir -p "$PACKAGE_DIR/postman"

print_header "Collecting Files"

# =============================================================================
# 1. Copy Integration Guide
# =============================================================================

if [ -f "$PROJECT_ROOT/docs/BANCA_INTEGRATION_GUIDE_FULL.md" ]; then
    cp "$PROJECT_ROOT/docs/BANCA_INTEGRATION_GUIDE_FULL.md" "$PACKAGE_DIR/docs/"
    print_step "Copied: BANCA_INTEGRATION_GUIDE_FULL.md"
else
    print_warning "Not found: BANCA_INTEGRATION_GUIDE_FULL.md"
fi

if [ -f "$PROJECT_ROOT/docs/BANCA_INTEGRATION_GUIDE.md" ]; then
    cp "$PROJECT_ROOT/docs/BANCA_INTEGRATION_GUIDE.md" "$PACKAGE_DIR/docs/"
    print_step "Copied: BANCA_INTEGRATION_GUIDE.md"
else
    print_warning "Not found: BANCA_INTEGRATION_GUIDE.md"
fi

# =============================================================================
# 2. Copy OpenAPI Specification
# =============================================================================

if [ -f "$PROJECT_ROOT/docs/openapi.yaml" ]; then
    cp "$PROJECT_ROOT/docs/openapi.yaml" "$PACKAGE_DIR/docs/"
    print_step "Copied: openapi.yaml"
else
    print_error "Not found: openapi.yaml (required)"
    exit 1
fi

# =============================================================================
# 3. Copy Integration Examples
# =============================================================================

if [ -f "$PROJECT_ROOT/docs/integration-examples/banca-integration-nodejs.js" ]; then
    cp "$PROJECT_ROOT/docs/integration-examples/banca-integration-nodejs.js" "$PACKAGE_DIR/examples/"
    print_step "Copied: banca-integration-nodejs.js"
fi

if [ -f "$PROJECT_ROOT/docs/integration-examples/banca-integration-php.php" ]; then
    cp "$PROJECT_ROOT/docs/integration-examples/banca-integration-php.php" "$PACKAGE_DIR/examples/"
    print_step "Copied: banca-integration-php.php"
fi

if [ -f "$PROJECT_ROOT/docs/integration-examples/LotolinkIntegration.java" ]; then
    cp "$PROJECT_ROOT/docs/integration-examples/LotolinkIntegration.java" "$PACKAGE_DIR/examples/"
    print_step "Copied: LotolinkIntegration.java"
fi

if [ -f "$PROJECT_ROOT/docs/integration-examples/README.md" ]; then
    cp "$PROJECT_ROOT/docs/integration-examples/README.md" "$PACKAGE_DIR/examples/"
    print_step "Copied: examples/README.md"
fi

# =============================================================================
# 4. Copy Postman Collection
# =============================================================================

if [ -f "$PROJECT_ROOT/docs/Lotolink-API.postman_collection.json" ]; then
    cp "$PROJECT_ROOT/docs/Lotolink-API.postman_collection.json" "$PACKAGE_DIR/postman/"
    print_step "Copied: Lotolink-API.postman_collection.json"
else
    print_warning "Not found: Lotolink-API.postman_collection.json"
fi

# =============================================================================
# 5. Create README.txt with Quick Start Instructions
# =============================================================================

# Get current date for dynamic versioning
CURRENT_DATE=$(date +"%B %Y")
CURRENT_YEAR=$(date +"%Y")

cat > "$PACKAGE_DIR/README.txt" << EOF
================================================================================
                    LOTOLINK - PAQUETE DE INTEGRACIÓN PARA BANCAS
                                    Versión 1.0
                                  $CURRENT_DATE
================================================================================

¡Bienvenido al paquete de integración de Lotolink!

Este paquete contiene todo lo necesario para integrar su sistema de banca
con la plataforma Lotolink.

================================================================================
CONTENIDO DEL PAQUETE
================================================================================

📁 docs/
   ├── BANCA_INTEGRATION_GUIDE_FULL.md  - Guía completa de integración (PDF-ready)
   ├── BANCA_INTEGRATION_GUIDE.md       - Guía resumida
   └── openapi.yaml                     - Especificación OpenAPI 3.0

📁 examples/
   ├── banca-integration-nodejs.js      - Ejemplo en Node.js
   ├── banca-integration-php.php        - Ejemplo en PHP
   ├── LotolinkIntegration.java         - Ejemplo en Java
   └── README.md                        - Instrucciones de uso

📁 postman/
   └── Lotolink-API.postman_collection.json  - Colección Postman lista para importar

================================================================================
INICIO RÁPIDO
================================================================================

1. LEER LA DOCUMENTACIÓN
   - Comience leyendo docs/BANCA_INTEGRATION_GUIDE_FULL.md
   - Revise los ejemplos de código en examples/

2. IMPORTAR COLECCIÓN POSTMAN
   - Abra Postman
   - File > Import > seleccione postman/Lotolink-API.postman_collection.json
   - Configure las variables de colección según su ambiente

3. PROBAR CON EL MOCK BANCA
   - Clone el repositorio Lotolink
   - Ejecute: cd mock-banca && npm install && npm start
   - Use la colección Postman para probar endpoints

4. IMPLEMENTAR SU INTEGRACIÓN
   - Use los ejemplos de código como referencia
   - Implemente el endpoint POST /v1/plays/register
   - Implemente el envío de webhooks a Lotolink
   - Valide firmas HMAC correctamente

5. SOLICITAR CREDENCIALES DE STAGING
   - Contacte a integraciones@lotolink.com
   - Proporcione información de su banca
   - Recibirá: client_id, client_secret, hmac_secret

6. PRUEBAS Y CERTIFICACIÓN
   - Pruebe en ambiente de staging
   - Complete el checklist de validación
   - Solicite certificación a Lotolink

================================================================================
SOPORTE TÉCNICO
================================================================================

Email:      integraciones@lotolink.com
WhatsApp:   Contactar al equipo de integraciones para número de soporte
Docs:       https://docs.lotolink.com
Status:     https://status.lotolink.com

Horario de soporte: Lunes a Viernes, 8:00 AM - 6:00 PM (AST)

================================================================================
REQUISITOS TÉCNICOS
================================================================================

- Servidor HTTPS con certificado válido
- Soporte para JSON (Content-Type: application/json)
- Capacidad de generar firmas HMAC-SHA256
- Endpoint público accesible desde Internet

================================================================================

Lotolink © $CURRENT_YEAR - Todos los derechos reservados

EOF

print_step "Created: README.txt"

# =============================================================================
# 6. Generate ZIP File
# =============================================================================

print_header "Generating ZIP Package"

cd "$TEMP_DIR"
zip -r "$OUTPUT_DIR/$PACKAGE_NAME.zip" "$PACKAGE_NAME" -x "*.DS_Store" -x "*__MACOSX*"

# =============================================================================
# 7. Summary
# =============================================================================

print_header "Package Generated Successfully"

echo ""
echo -e "  ${GREEN}Package:${NC} $OUTPUT_DIR/$PACKAGE_NAME.zip"
echo ""

# Show package contents
echo "  Contents:"
unzip -l "$OUTPUT_DIR/$PACKAGE_NAME.zip" | head -20
echo "  ..."

# Show file size
FILE_SIZE=$(du -h "$OUTPUT_DIR/$PACKAGE_NAME.zip" | cut -f1)
echo ""
echo -e "  ${GREEN}Size:${NC} $FILE_SIZE"
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Integration package generated successfully!            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
