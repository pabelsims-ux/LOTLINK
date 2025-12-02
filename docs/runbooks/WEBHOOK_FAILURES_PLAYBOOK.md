# Webhook Failures Playbook

## Overview

This playbook provides detailed procedures for diagnosing and resolving webhook-related failures in the Lotolink platform. Webhooks are critical for:

1. **Outgoing**: Sending play requests to bancas
2. **Incoming**: Receiving play confirmations from bancas

---

## Common Webhook Failure Scenarios

| Scenario | Symptoms | Priority |
|----------|----------|----------|
| Signature validation failures | 401 Unauthorized responses | P1 |
| Timestamp validation failures | 400 Bad Request responses | P1 |
| Connection timeouts | 504 Gateway Timeout | P1 |
| Banca endpoint down | Connection refused | P1 |
| Plays stuck in pending | No confirmations received | P2 |
| Partial failures | Some bancas work, others don't | P2 |

---

## Diagnostic Procedures

### 1. Check Webhook Logs

```bash
# View recent webhook-related logs
kubectl logs -n lotolink deployment/lotolink-backend --tail=500 | grep -i webhook

# Filter for errors only
kubectl logs -n lotolink deployment/lotolink-backend | grep -E "(webhook|signature|HMAC)" | grep -i error

# Check specific timeframe
kubectl logs -n lotolink deployment/lotolink-backend --since=1h | grep webhook
```

### 2. Verify HMAC Configuration

```bash
# Check that HMAC secret is configured (don't log the actual secret!)
kubectl exec -n lotolink deployment/lotolink-backend -- \
  node -e "console.log('HMAC configured:', !!process.env.HMAC_SECRET)"

# Verify HMAC secret length
kubectl exec -n lotolink deployment/lotolink-backend -- \
  node -e "console.log('HMAC length:', process.env.HMAC_SECRET?.length || 0)"
```

### 3. Test Signature Generation

Use this script to verify signature generation matches:

```javascript
// test-signature.js
const crypto = require('crypto');

const method = 'POST';
const path = '/webhooks/plays/confirmation';
const timestamp = new Date().toISOString();
const body = JSON.stringify({
  requestId: 'test-request-id',
  playIdBanca: 'BANCA-123',
  ticketCode: 'TKT-123',
  status: 'confirmed'
});

const signatureBase = `${method}${path}${timestamp}${body}`;
const hmac = crypto.createHmac('sha256', process.env.HMAC_SECRET);
hmac.update(signatureBase);
const signature = hmac.digest('base64');

console.log('Signature Base:', signatureBase);
console.log('Generated Signature:', signature);
```

### 4. Check Clock Synchronization

Timestamp validation requires synchronized clocks:

```bash
# Check server time
kubectl exec -n lotolink deployment/lotolink-backend -- date -u

# Check NTP status
kubectl exec -n lotolink deployment/lotolink-backend -- timedatectl status

# Compare with banca server time (if accessible)
curl -I https://banca-api.example.com 2>/dev/null | grep -i date
```

### 5. Monitor Webhook Metrics

```promql
# Webhook success rate
sum(rate(webhook_requests_total{status="success"}[5m])) / sum(rate(webhook_requests_total[5m]))

# Webhook latency
histogram_quantile(0.95, sum(rate(webhook_duration_seconds_bucket[5m])) by (le))

# Webhook failures by error type
sum(rate(webhook_requests_total{status="error"}[5m])) by (error_type)
```

---

## Resolution Procedures

### Scenario 1: Signature Validation Failures (401)

#### Symptoms
- Incoming webhooks rejected with 401 Unauthorized
- Logs show "Invalid signature" errors

#### Root Causes
1. HMAC secret mismatch between Lotolink and Banca
2. Request body modified in transit
3. Different signature calculation methods
4. Character encoding issues

#### Resolution Steps

**Step 1: Verify HMAC secrets match**
```bash
# On Lotolink side - get hash of secret (for comparison, not the secret itself)
kubectl exec -n lotolink deployment/lotolink-backend -- \
  node -e "console.log(require('crypto').createHash('sha256').update(process.env.HMAC_SECRET).digest('hex').substring(0,8))"

# Compare with banca's secret hash
```

**Step 2: Test signature calculation**
```bash
# Use smoke tests to verify signature generation
./scripts/smoke-tests.sh | grep -A5 "Webhook"
```

**Step 3: Check request body**
```bash
# Ensure raw body is being used for signature verification
# Check middleware configuration in backend
grep -r "rawBody" backend/src/
```

**Step 4: Rotate secrets if compromised**
```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Update in secret manager
kubectl create secret generic lotolink-secrets \
  --from-literal=HMAC_SECRET="$NEW_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -

# Coordinate with banca to update their secret
```

---

### Scenario 2: Timestamp Validation Failures (400)

#### Symptoms
- Webhooks rejected with 400 Bad Request
- Logs show "Timestamp out of range" errors

#### Root Causes
1. Clock skew between servers
2. Requests taking too long to arrive
3. Replay attack protection triggered

#### Resolution Steps

**Step 1: Check timestamp tolerance**
```bash
# Default is 120 seconds
kubectl exec -n lotolink deployment/lotolink-backend -- \
  node -e "console.log('Tolerance:', process.env.HMAC_TIMESTAMP_TOLERANCE_SECONDS || 120)"
```

**Step 2: Sync server clocks**
```bash
# Force NTP sync
kubectl exec -n lotolink deployment/lotolink-backend -- \
  ntpdate -u pool.ntp.org

# Or use chrony
kubectl exec -n lotolink deployment/lotolink-backend -- \
  chronyc makestep
```

**Step 3: Temporarily increase tolerance (emergency only)**
```bash
# Increase to 5 minutes temporarily
kubectl set env deployment/lotolink-backend \
  HMAC_TIMESTAMP_TOLERANCE_SECONDS=300 -n lotolink
```

**Step 4: Investigate network latency**
```bash
# Check latency to banca
kubectl exec -n lotolink deployment/lotolink-backend -- \
  curl -w "@-" -o /dev/null -s https://banca-api.example.com/health <<'EOF'
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF
```

---

### Scenario 3: Connection Timeouts (504)

#### Symptoms
- Outgoing webhooks timeout
- 504 Gateway Timeout errors

#### Root Causes
1. Banca endpoint overloaded
2. Network issues
3. DNS resolution failures
4. Firewall blocking

#### Resolution Steps

**Step 1: Check banca health**
```bash
# Direct health check
curl -s --connect-timeout 5 https://banca-api.example.com/health

# Check from within cluster
kubectl exec -n lotolink deployment/lotolink-backend -- \
  curl -s --connect-timeout 5 https://banca-api.example.com/health
```

**Step 2: Check DNS resolution**
```bash
kubectl exec -n lotolink deployment/lotolink-backend -- \
  nslookup banca-api.example.com
```

**Step 3: Check firewall/network policies**
```bash
# List network policies
kubectl get networkpolicies -n lotolink

# Check if egress is allowed
kubectl describe networkpolicy <policy-name> -n lotolink
```

**Step 4: Enable retry logic**
```javascript
// Ensure retry logic is configured
const response = await fetch(bancaUrl, {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(30000), // 30 second timeout
});

// Implement exponential backoff for retries
```

---

### Scenario 4: Plays Stuck in Pending

#### Symptoms
- Plays created but never confirmed
- No webhook confirmations received
- Banca shows play was processed

#### Root Causes
1. Webhook URL misconfigured on banca side
2. Firewall blocking incoming webhooks
3. Webhook endpoint down
4. Message queue issues

#### Resolution Steps

**Step 1: Verify webhook endpoint is accessible**
```bash
# From external network
curl -X POST https://api.lotolink.com/webhooks/plays/confirmation \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Should return 401 (unauthorized) not connection error
```

**Step 2: Check pending plays**
```sql
-- Find plays stuck in pending for more than 1 hour
SELECT id, request_id, status, created_at, updated_at
FROM plays
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 100;
```

**Step 3: Trigger manual reconciliation**
```bash
# Run reconciliation script
./scripts/reconciliation.sh

# Or for specific plays
./scripts/reconciliation.sh --request-ids "id1,id2,id3"
```

**Step 4: Contact banca support**
- Verify webhook URL configuration
- Request webhook delivery logs
- Confirm they can reach our endpoint

---

## Webhook Retry Strategy

### Outgoing Webhooks (to Bancas)

```javascript
const retryStrategy = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

// Retry schedule: 1s, 2s, 4s (total ~7s before giving up)
```

### Incoming Webhooks (from Bancas)

- We don't retry incoming webhooks
- Bancas should implement retry logic
- Recommended banca retry: 5 attempts over 1 hour

---

## Monitoring and Alerting

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| Webhook success rate | < 99% | < 95% |
| Webhook latency P95 | > 5s | > 10s |
| Pending plays > 1h | > 10 | > 50 |
| Signature failures/min | > 5 | > 20 |

### Alert Rules (Prometheus)

```yaml
groups:
  - name: webhook_alerts
    rules:
      - alert: WebhookHighFailureRate
        expr: |
          (sum(rate(webhook_requests_total{status="error"}[5m])) 
           / sum(rate(webhook_requests_total[5m]))) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Webhook failure rate above 5%"
          
      - alert: PlaysStuckInPending
        expr: |
          count(plays_status{status="pending"} 
            and on(id) (time() - plays_created_at > 3600)) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "More than 10 plays stuck in pending for over 1 hour"
```

---

## Quick Reference: Webhook Debugging Checklist

- [ ] Check webhook logs for specific error messages
- [ ] Verify HMAC secrets match (compare hashes, not secrets)
- [ ] Check clock synchronization between servers
- [ ] Verify endpoint accessibility from sender's network
- [ ] Check for network/firewall issues
- [ ] Verify request body format and encoding
- [ ] Check message queue health (RabbitMQ)
- [ ] Review recent deployments or configuration changes
- [ ] Check banca's webhook delivery logs
- [ ] Run smoke tests to validate webhook flow

---

## Appendix: HMAC Signature Calculation Reference

### Lotolink Implementation (TypeScript)

```typescript
import { createHmac } from 'crypto';

function calculateSignature(
  method: string,
  path: string,
  timestamp: string,
  body: string,
  secret: string
): string {
  const signatureBase = `${method}${path}${timestamp}${body}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(signatureBase);
  return hmac.digest('base64');
}

// Example:
// method: "POST"
// path: "/webhooks/plays/confirmation"
// timestamp: "2025-01-15T10:30:00Z"
// body: '{"requestId":"abc","status":"confirmed"}'
// Result: Base64-encoded HMAC-SHA256
```

### Banca Implementation Examples

See `/docs/integration-examples/` for implementations in:
- Node.js
- PHP
- Java
