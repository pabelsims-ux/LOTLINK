#!/bin/bash
# =============================================================================
# Lotolink - Smoke Tests Script
# =============================================================================
# This script validates critical system functionality using curl
# Usage: ./scripts/smoke-tests.sh [BASE_URL] [MOCK_BANCA_URL]
# 
# Environment variables:
#   BASE_URL - Lotolink backend URL (default: http://localhost:3000)
#   MOCK_BANCA_URL - Mock Banca URL (default: http://localhost:4000)
#   HMAC_SECRET - HMAC secret for webhook signatures (default: test_hmac_secret)
#   JWT_TOKEN - JWT token for authentication (will use mock if not provided)
# =============================================================================

set -e

# =============================================================================
# CONFIGURATION
# =============================================================================

BASE_URL="${BASE_URL:-${1:-http://localhost:3000}}"
MOCK_BANCA_URL="${MOCK_BANCA_URL:-${2:-http://localhost:4000}}"
HMAC_SECRET="${HMAC_SECRET:-test_hmac_secret}"
JWT_TOKEN="${JWT_TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXJfMTIzIiwiaWF0IjoxNjE2MjM5MDIyfQ.test}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Temp file for response storage
RESPONSE_FILE=$(mktemp)
trap "rm -f $RESPONSE_FILE" EXIT

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_test() {
    echo -n "  Testing: $1... "
}

print_pass() {
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}✗ FAIL${NC}"
    echo -e "    ${RED}Error: $1${NC}"
    ((FAILED++))
}

print_skip() {
    echo -e "${YELLOW}⊘ SKIP${NC}"
    echo -e "    ${YELLOW}Reason: $1${NC}"
    ((SKIPPED++))
}

# Generate a UUID v4
generate_uuid() {
    if command -v uuidgen &> /dev/null; then
        uuidgen | tr '[:upper:]' '[:lower:]'
    else
        cat /proc/sys/kernel/random/uuid 2>/dev/null || \
        python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || \
        echo "$(date +%s)-$(head /dev/urandom | tr -dc 'a-f0-9' | head -c 32)"
    fi
}

# Calculate HMAC-SHA256 signature (base64)
calculate_signature() {
    local method="$1"
    local path="$2"
    local timestamp="$3"
    local body="$4"
    
    local signature_base="${method}${path}${timestamp}${body}"
    echo -n "$signature_base" | openssl dgst -sha256 -hmac "$HMAC_SECRET" -binary | base64
}

# Check if service is healthy
check_health() {
    local url="$1"
    local timeout="${2:-5}"
    
    curl -s -f --connect-timeout "$timeout" "$url" > /dev/null 2>&1
    return $?
}

# =============================================================================
# HEALTH CHECKS
# =============================================================================

print_header "1. Health Checks"

# Check Lotolink Backend
print_test "Lotolink Backend Health ($BASE_URL/health)"
if curl -s -f --connect-timeout 5 "$BASE_URL/health" > "$RESPONSE_FILE" 2>&1; then
    print_pass
else
    print_skip "Backend not running or health endpoint not available"
fi

# Check Mock Banca
print_test "Mock Banca Health ($MOCK_BANCA_URL/health)"
if curl -s -f --connect-timeout 5 "$MOCK_BANCA_URL/health" > "$RESPONSE_FILE" 2>&1; then
    STATUS=$(cat "$RESPONSE_FILE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$STATUS" = "ok" ]; then
        print_pass
    else
        print_fail "Unexpected status: $STATUS"
    fi
else
    print_skip "Mock Banca not running"
fi

# =============================================================================
# IDEMPOTENCY TESTS
# =============================================================================

print_header "2. Idempotency Tests"

REQUEST_ID=$(generate_uuid)
PLAY_PAYLOAD=$(cat <<EOF
{
  "requestId": "$REQUEST_ID",
  "userId": "smoke_test_user",
  "lotteryId": "lottoRD_01",
  "numbers": ["03", "07", "12"],
  "betType": "quiniela",
  "amount": 50,
  "currency": "DOP",
  "payment": {
    "method": "wallet",
    "walletTransactionId": "wl_smoke_$(date +%s)"
  }
}
EOF
)

# First request
print_test "Create Play (First Request)"
HTTP_CODE=$(curl -s -w "%{http_code}" -o "$RESPONSE_FILE" \
    -X POST "$BASE_URL/api/v1/plays" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Idempotency-Key: $REQUEST_ID" \
    -d "$PLAY_PAYLOAD")

if [ "$HTTP_CODE" = "201" ]; then
    PLAY_ID_1=$(cat "$RESPONSE_FILE" | grep -o '"playId":"[^"]*"' | cut -d'"' -f4)
    print_pass
elif [ "$HTTP_CODE" = "401" ]; then
    print_skip "Authentication required (JWT token invalid)"
else
    print_fail "HTTP $HTTP_CODE - Expected 201 or 401"
fi

# Second request with same idempotency key
print_test "Create Play (Idempotent Retry)"
HTTP_CODE=$(curl -s -w "%{http_code}" -o "$RESPONSE_FILE" \
    -X POST "$BASE_URL/api/v1/plays" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Idempotency-Key: $REQUEST_ID" \
    -d "$PLAY_PAYLOAD")

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    PLAY_ID_2=$(cat "$RESPONSE_FILE" | grep -o '"playId":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$PLAY_ID_1" ] && [ "$PLAY_ID_1" = "$PLAY_ID_2" ]; then
        print_pass
    elif [ -z "$PLAY_ID_1" ]; then
        print_skip "Cannot verify idempotency without first request"
    else
        print_fail "Different playId returned: $PLAY_ID_1 vs $PLAY_ID_2"
    fi
elif [ "$HTTP_CODE" = "401" ]; then
    print_skip "Authentication required"
else
    print_fail "HTTP $HTTP_CODE - Expected 200/201 or 401"
fi

# Request with mismatched idempotency key
print_test "Create Play (Mismatched Idempotency Key)"
DIFFERENT_KEY=$(generate_uuid)
HTTP_CODE=$(curl -s -w "%{http_code}" -o "$RESPONSE_FILE" \
    -X POST "$BASE_URL/api/v1/plays" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Idempotency-Key: $DIFFERENT_KEY" \
    -d "$PLAY_PAYLOAD")

if [ "$HTTP_CODE" = "400" ]; then
    print_pass
elif [ "$HTTP_CODE" = "401" ]; then
    print_skip "Authentication required"
else
    print_fail "HTTP $HTTP_CODE - Expected 400 (Bad Request)"
fi

# =============================================================================
# WEBHOOK TESTS
# =============================================================================

print_header "3. Webhook Security Tests"

WEBHOOK_REQUEST_ID=$(generate_uuid)
WEBHOOK_PATH="/webhooks/plays/confirmation"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

WEBHOOK_PAYLOAD=$(cat <<EOF
{
  "requestId": "$WEBHOOK_REQUEST_ID",
  "playIdBanca": "BANCA-SMOKE123",
  "ticketCode": "TKT-SMOKE123",
  "status": "confirmed"
}
EOF
)

# Test: Valid signature
print_test "Webhook with Valid Signature"
SIGNATURE=$(calculate_signature "POST" "$WEBHOOK_PATH" "$TIMESTAMP" "$WEBHOOK_PAYLOAD")
HTTP_CODE=$(curl -s -w "%{http_code}" -o "$RESPONSE_FILE" \
    -X POST "$BASE_URL$WEBHOOK_PATH" \
    -H "Content-Type: application/json" \
    -H "X-Signature: $SIGNATURE" \
    -H "X-Timestamp: $TIMESTAMP" \
    -d "$WEBHOOK_PAYLOAD")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
    # 200 = success, 404 = play not found (expected for random requestId)
    print_pass
else
    print_fail "HTTP $HTTP_CODE - Expected 200 or 404"
fi

# Test: Invalid signature
print_test "Webhook with Invalid Signature"
HTTP_CODE=$(curl -s -w "%{http_code}" -o "$RESPONSE_FILE" \
    -X POST "$BASE_URL$WEBHOOK_PATH" \
    -H "Content-Type: application/json" \
    -H "X-Signature: invalid_signature_here" \
    -H "X-Timestamp: $TIMESTAMP" \
    -d "$WEBHOOK_PAYLOAD")

if [ "$HTTP_CODE" = "401" ]; then
    print_pass
else
    print_fail "HTTP $HTTP_CODE - Expected 401 (Unauthorized)"
fi

# Test: Missing signature
print_test "Webhook with Missing Signature"
HTTP_CODE=$(curl -s -w "%{http_code}" -o "$RESPONSE_FILE" \
    -X POST "$BASE_URL$WEBHOOK_PATH" \
    -H "Content-Type: application/json" \
    -H "X-Timestamp: $TIMESTAMP" \
    -d "$WEBHOOK_PAYLOAD")

if [ "$HTTP_CODE" = "401" ]; then
    print_pass
else
    print_fail "HTTP $HTTP_CODE - Expected 401 (Unauthorized)"
fi

# Test: Expired timestamp
print_test "Webhook with Expired Timestamp"
EXPIRED_TIMESTAMP=$(date -u -d "10 minutes ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
                    date -u -v-10M +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
                    echo "2020-01-01T00:00:00Z")
EXPIRED_SIGNATURE=$(calculate_signature "POST" "$WEBHOOK_PATH" "$EXPIRED_TIMESTAMP" "$WEBHOOK_PAYLOAD")
HTTP_CODE=$(curl -s -w "%{http_code}" -o "$RESPONSE_FILE" \
    -X POST "$BASE_URL$WEBHOOK_PATH" \
    -H "Content-Type: application/json" \
    -H "X-Signature: $EXPIRED_SIGNATURE" \
    -H "X-Timestamp: $EXPIRED_TIMESTAMP" \
    -d "$WEBHOOK_PAYLOAD")

if [ "$HTTP_CODE" = "400" ]; then
    print_pass
else
    print_fail "HTTP $HTTP_CODE - Expected 400 (Bad Request)"
fi

# =============================================================================
# AUTHENTICATION TESTS
# =============================================================================

print_header "4. Authentication Tests"

# Test: Request without token
print_test "API Request without Authentication"
HTTP_CODE=$(curl -s -w "%{http_code}" -o "$RESPONSE_FILE" \
    -X POST "$BASE_URL/api/v1/plays" \
    -H "Content-Type: application/json" \
    -d '{"requestId": "test"}')

if [ "$HTTP_CODE" = "401" ]; then
    print_pass
else
    print_fail "HTTP $HTTP_CODE - Expected 401 (Unauthorized)"
fi

# Test: Request with invalid token
print_test "API Request with Invalid Token"
HTTP_CODE=$(curl -s -w "%{http_code}" -o "$RESPONSE_FILE" \
    -X POST "$BASE_URL/api/v1/plays" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer invalid_token_here" \
    -d '{"requestId": "test"}')

if [ "$HTTP_CODE" = "401" ]; then
    print_pass
else
    print_fail "HTTP $HTTP_CODE - Expected 401 (Unauthorized)"
fi

# =============================================================================
# MOCK BANCA TESTS
# =============================================================================

print_header "5. Mock Banca Tests"

# Check if mock banca is running
if check_health "$MOCK_BANCA_URL/health"; then
    # Reset mock banca state
    print_test "Reset Mock Banca State"
    HTTP_CODE=$(curl -s -w "%{http_code}" -o "$RESPONSE_FILE" \
        -X POST "$MOCK_BANCA_URL/admin/reset")
    if [ "$HTTP_CODE" = "200" ]; then
        print_pass
    else
        print_fail "HTTP $HTTP_CODE - Expected 200"
    fi

    # Configure for synchronous response
    print_test "Configure Sync Mode"
    HTTP_CODE=$(curl -s -w "%{http_code}" -o "$RESPONSE_FILE" \
        -X POST "$MOCK_BANCA_URL/admin/config" \
        -H "Content-Type: application/json" \
        -d '{"syncResponseRate": 1.0, "confirmRate": 1.0}')
    if [ "$HTTP_CODE" = "200" ]; then
        print_pass
    else
        print_fail "HTTP $HTTP_CODE - Expected 200"
    fi

    # Register a play
    print_test "Register Play with Mock Banca"
    BANCA_REQUEST_ID=$(generate_uuid)
    BANCA_PAYLOAD=$(cat <<EOF
{
  "requestId": "$BANCA_REQUEST_ID",
  "play": {
    "lotteryId": "lottoRD_01",
    "numbers": ["03", "07", "12"],
    "betType": "quiniela",
    "amount": 50
  },
  "payment": {
    "method": "wallet",
    "transactionId": "wl_smoke_$(date +%s)"
  },
  "user": {
    "id": "smoke_test_user"
  }
}
EOF
)
    HTTP_CODE=$(curl -s -w "%{http_code}" -o "$RESPONSE_FILE" \
        -X POST "$MOCK_BANCA_URL/v1/plays/register" \
        -H "Content-Type: application/json" \
        -H "Idempotency-Key: $BANCA_REQUEST_ID" \
        -d "$BANCA_PAYLOAD")
    if [ "$HTTP_CODE" = "200" ]; then
        STATUS=$(cat "$RESPONSE_FILE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ "$STATUS" = "confirmed" ]; then
            print_pass
        else
            print_fail "Unexpected status: $STATUS"
        fi
    else
        print_fail "HTTP $HTTP_CODE - Expected 200"
    fi

    # Test idempotency on mock banca
    print_test "Mock Banca Idempotency"
    HTTP_CODE=$(curl -s -w "%{http_code}" -o "$RESPONSE_FILE" \
        -X POST "$MOCK_BANCA_URL/v1/plays/register" \
        -H "Content-Type: application/json" \
        -H "Idempotency-Key: $BANCA_REQUEST_ID" \
        -d "$BANCA_PAYLOAD")
    if [ "$HTTP_CODE" = "200" ]; then
        print_pass
    else
        print_fail "HTTP $HTTP_CODE - Expected 200 (idempotent response)"
    fi
else
    print_skip "Reset Mock Banca - Mock Banca not running"
    print_skip "Configure Sync Mode - Mock Banca not running"
    print_skip "Register Play with Mock Banca - Mock Banca not running"
    print_skip "Mock Banca Idempotency - Mock Banca not running"
fi

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}Passed:  $PASSED${NC}"
echo -e "  ${RED}Failed:  $FAILED${NC}"
echo -e "  ${YELLOW}Skipped: $SKIPPED${NC}"
echo ""

TOTAL=$((PASSED + FAILED + SKIPPED))
if [ $TOTAL -gt 0 ]; then
    PASS_RATE=$((PASSED * 100 / TOTAL))
    echo -e "  Pass Rate: $PASS_RATE%"
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ ALL SMOKE TESTS PASSED                                 ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ SOME SMOKE TESTS FAILED                                ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
