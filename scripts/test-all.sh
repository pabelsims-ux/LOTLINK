#!/bin/bash
# =============================================================================
# Lotolink - Script de Prueba Rápida
# =============================================================================
# Este script verifica que el sistema Lotolink funciona correctamente
# Ejecutar desde la raíz del proyecto: ./scripts/test-all.sh
# =============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
PASSED=0
FAILED=0

# Función para imprimir resultado
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ $2${NC}"
        ((FAILED++))
    fi
}

# Función para imprimir sección
print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# INICIO DE PRUEBAS
# =============================================================================

echo ""
echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║            LOTOLINK - Script de Pruebas                   ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"

# -----------------------------------------------------------------------------
# 1. VERIFICAR ESTRUCTURA DE ARCHIVOS
# -----------------------------------------------------------------------------
print_section "1. Verificando estructura de archivos"

# Archivos principales
[ -f "index.html" ]
print_result $? "index.html existe"

[ -f "lotolink-logo.png" ]
print_result $? "lotolink-logo.png existe"

[ -f "README.md" ]
print_result $? "README.md existe"

[ -f "docker-compose.yml" ]
print_result $? "docker-compose.yml existe"

# Documentación
[ -f "docs/TECH_EVALUATION.md" ]
print_result $? "docs/TECH_EVALUATION.md existe"

[ -f "docs/BANCA_INTEGRATION_GUIDE.md" ]
print_result $? "docs/BANCA_INTEGRATION_GUIDE.md existe"

[ -f "docs/TESTING_GUIDE.md" ]
print_result $? "docs/TESTING_GUIDE.md existe"

# Ejemplos de integración
[ -f "docs/integration-examples/banca-integration-nodejs.js" ]
print_result $? "Ejemplo Node.js existe"

[ -f "docs/integration-examples/banca-integration-php.php" ]
print_result $? "Ejemplo PHP existe"

[ -f "docs/integration-examples/LotolinkIntegration.java" ]
print_result $? "Ejemplo Java existe"

# Backend
[ -f "backend/package.json" ]
print_result $? "backend/package.json existe"

[ -f "backend/src/main.ts" ]
print_result $? "backend/src/main.ts existe"

[ -d "backend/src/domain" ]
print_result $? "backend/src/domain/ existe"

[ -d "backend/src/infrastructure" ]
print_result $? "backend/src/infrastructure/ existe"

# Migraciones
[ -f "backend/database/migrations/001_init.sql" ]
print_result $? "Migración SQL existe"

# -----------------------------------------------------------------------------
# 2. VERIFICAR DEPENDENCIAS DEL BACKEND
# -----------------------------------------------------------------------------
print_section "2. Verificando dependencias del backend"

cd backend

if [ -f "package-lock.json" ] || [ -d "node_modules" ]; then
    print_result 0 "Dependencias instaladas o lock file existe"
else
    echo -e "${YELLOW}  Instalando dependencias...${NC}"
    npm install --silent 2>/dev/null
    print_result $? "Dependencias instaladas"
fi

cd ..

# -----------------------------------------------------------------------------
# 3. EJECUTAR TESTS DEL BACKEND
# -----------------------------------------------------------------------------
print_section "3. Ejecutando tests del backend"

cd backend

# Ejecutar tests
npm test --silent 2>/dev/null
TEST_RESULT=$?

if [ $TEST_RESULT -eq 0 ]; then
    print_result 0 "Tests unitarios pasan"
else
    print_result 1 "Tests unitarios fallan"
fi

cd ..

# -----------------------------------------------------------------------------
# 4. VERIFICAR COMPILACIÓN DEL BACKEND
# -----------------------------------------------------------------------------
print_section "4. Verificando compilación TypeScript"

cd backend

# Compilar
npm run build --silent 2>/dev/null
BUILD_RESULT=$?

if [ $BUILD_RESULT -eq 0 ]; then
    print_result 0 "Código compila sin errores"
else
    print_result 1 "Error de compilación"
fi

cd ..

# -----------------------------------------------------------------------------
# 5. VERIFICAR LINTER
# -----------------------------------------------------------------------------
print_section "5. Verificando linter"

cd backend

# Ejecutar linter (puede fallar si hay warnings, no es crítico)
npm run lint --silent 2>/dev/null
LINT_RESULT=$?

if [ $LINT_RESULT -eq 0 ]; then
    print_result 0 "Linter pasa sin errores"
else
    echo -e "${YELLOW}  ⚠ Linter tiene warnings (no crítico)${NC}"
fi

cd ..

# -----------------------------------------------------------------------------
# 6. VERIFICAR TAMAÑO DEL HTML
# -----------------------------------------------------------------------------
print_section "6. Verificando optimización del HTML"

HTML_SIZE=$(stat -f%z "index.html" 2>/dev/null || stat -c%s "index.html" 2>/dev/null || echo "0")
HTML_SIZE_KB=$((HTML_SIZE / 1024))

if [ $HTML_SIZE_KB -lt 500 ]; then
    print_result 0 "index.html optimizado (${HTML_SIZE_KB} KB < 500 KB)"
else
    echo -e "${YELLOW}  ⚠ index.html grande (${HTML_SIZE_KB} KB) - considerar optimización${NC}"
fi

# -----------------------------------------------------------------------------
# 7. VERIFICAR DOCKER (si está disponible)
# -----------------------------------------------------------------------------
print_section "7. Verificando Docker (opcional)"

if command -v docker &> /dev/null; then
    print_result 0 "Docker instalado"
    
    if command -v docker-compose &> /dev/null; then
        print_result 0 "Docker Compose instalado"
        
        # Verificar que el docker-compose.yml es válido
        docker-compose config --quiet 2>/dev/null
        print_result $? "docker-compose.yml válido"
    else
        echo -e "${YELLOW}  ⚠ Docker Compose no instalado${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠ Docker no instalado (pruebas Docker omitidas)${NC}"
fi

# =============================================================================
# RESUMEN FINAL
# =============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  RESUMEN${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}Pasaron: $PASSED${NC}"
echo -e "  ${RED}Fallaron: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ TODAS LAS PRUEBAS PASARON - SISTEMA LISTO             ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "  1. docker-compose up -d   (levantar servicios)"
    echo "  2. Abrir http://localhost:3000 (API)"
    echo "  3. Abrir index.html (Frontend)"
    echo ""
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ ALGUNAS PRUEBAS FALLARON                               ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Ver docs/TESTING_GUIDE.md para solución de problemas"
    echo ""
    exit 1
fi
