# Incident Response Runbook

## Overview

This runbook provides step-by-step guidance for handling production incidents in the Lotolink platform.

## Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **P0 - Critical** | Complete service outage, data loss, security breach | Immediate (< 15 min) | Payment processing down, data breach |
| **P1 - High** | Major functionality degraded, affecting many users | < 30 minutes | Webhook failures > 50%, slow response times |
| **P2 - Medium** | Minor functionality impacted, workaround available | < 2 hours | Single banca integration down, minor errors |
| **P3 - Low** | Cosmetic issues, planned maintenance | < 24 hours | UI bugs, non-critical logging issues |

## Escalation Contacts

| Role | Contact | Phone | When to Escalate |
|------|---------|-------|------------------|
| On-Call Engineer | [TBD] | [TBD] | First response |
| Tech Lead | [TBD] | [TBD] | P0/P1 incidents |
| Engineering Manager | [TBD] | [TBD] | P0 incidents, extended outages |
| CTO | [TBD] | [TBD] | Major security incidents, data loss |
| Legal/Compliance | [TBD] | [TBD] | Data breaches, regulatory issues |

---

## Incident Response Procedures

### 1. Initial Response (First 15 Minutes)

#### Step 1: Acknowledge the Incident
```bash
# Check system health
curl -s http://api.lotolink.com/health | jq .

# Check key metrics
# - Error rates
# - Response times
# - Queue depth
# - Database connections
```

#### Step 2: Assess Severity
- [ ] Determine number of affected users
- [ ] Identify impacted services
- [ ] Check payment processing status
- [ ] Review recent deployments

#### Step 3: Start Incident Communication
- Create incident channel: `#incident-YYYY-MM-DD-brief-description`
- Post initial status update
- Notify relevant stakeholders

---

### 2. Service Outage - Backend API

#### Symptoms
- HTTP 5xx errors increasing
- Health check failures
- No response from API endpoints

#### Diagnostic Steps

```bash
# 1. Check pod status
kubectl get pods -n lotolink

# 2. Check pod logs
kubectl logs -n lotolink deployment/lotolink-backend --tail=100

# 3. Check resource usage
kubectl top pods -n lotolink

# 4. Check database connectivity
kubectl exec -n lotolink deployment/lotolink-backend -- \
  node -e "require('pg').Pool({connectionString: process.env.DATABASE_URL}).query('SELECT 1')"

# 5. Check Redis connectivity
kubectl exec -n lotolink deployment/lotolink-backend -- \
  redis-cli -h $REDIS_HOST ping
```

#### Resolution Steps

**If: Out of memory**
```bash
# Scale horizontally
kubectl scale deployment/lotolink-backend --replicas=5 -n lotolink

# Or restart pods
kubectl rollout restart deployment/lotolink-backend -n lotolink
```

**If: Database connection exhausted**
```bash
# Check active connections
kubectl exec -n lotolink deployment/postgres -- \
  psql -U lotolink -c "SELECT count(*) FROM pg_stat_activity"

# Kill idle connections if necessary
kubectl exec -n lotolink deployment/postgres -- \
  psql -U lotolink -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '30 minutes'"
```

**If: Recent bad deployment**
```bash
# Rollback to previous version
kubectl rollout undo deployment/lotolink-backend -n lotolink

# Check rollback status
kubectl rollout status deployment/lotolink-backend -n lotolink
```

---

### 3. Database Issues

#### Symptoms
- Slow queries
- Connection timeouts
- Replication lag

#### Diagnostic Steps

```bash
# 1. Check database status
kubectl exec -n lotolink deployment/postgres -- \
  psql -U lotolink -c "SELECT * FROM pg_stat_activity WHERE state != 'idle'"

# 2. Check for locks
kubectl exec -n lotolink deployment/postgres -- \
  psql -U lotolink -c "SELECT * FROM pg_locks WHERE NOT granted"

# 3. Check slow queries
kubectl exec -n lotolink deployment/postgres -- \
  psql -U lotolink -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'"

# 4. Check disk space
kubectl exec -n lotolink deployment/postgres -- df -h /var/lib/postgresql/data
```

#### Resolution Steps

**If: Long-running queries**
```bash
# Terminate problematic queries
kubectl exec -n lotolink deployment/postgres -- \
  psql -U lotolink -c "SELECT pg_terminate_backend(PID)"
```

**If: Disk space low**
```bash
# Run vacuum
kubectl exec -n lotolink deployment/postgres -- \
  psql -U lotolink -c "VACUUM ANALYZE"

# Alert infrastructure team for disk expansion
```

---

### 4. Payment Processing Issues

#### Symptoms
- Payments failing
- Webhook confirmations not arriving
- Plays stuck in "pending" status

#### Diagnostic Steps

```bash
# 1. Check payment gateway status
curl -s https://api.stripe.com/healthcheck

# 2. Check webhook delivery status
# Review Stripe dashboard for failed webhooks

# 3. Check pending plays count
kubectl exec -n lotolink deployment/lotolink-backend -- \
  node -e "... query for pending plays older than 1 hour"

# 4. Check RabbitMQ queue depth
kubectl exec -n lotolink deployment/rabbitmq -- \
  rabbitmqctl list_queues
```

#### Resolution Steps

**If: Stripe webhook failures**
```bash
# Retry failed webhooks from Stripe dashboard
# Or manually process pending confirmations

# Check webhook logs
kubectl logs -n lotolink deployment/lotolink-backend | grep webhook
```

**If: Plays stuck in pending**
```bash
# Run manual reconciliation
./scripts/reconciliation.sh --force-check
```

---

### 5. Banca Integration Issues

#### Symptoms
- Plays not being forwarded to bancas
- Webhook confirmations failing
- Increased error rates from banca endpoints

#### Diagnostic Steps

```bash
# 1. Check banca health
curl -s http://banca-api.example.com/health

# 2. Check outgoing request logs
kubectl logs -n lotolink deployment/lotolink-backend | grep "banca"

# 3. Check webhook signature validation
kubectl logs -n lotolink deployment/lotolink-backend | grep "signature"

# 4. Verify HMAC secrets match
# Compare configured secrets with banca
```

#### Resolution Steps

See: [Webhook Failures Playbook](./WEBHOOK_FAILURES_PLAYBOOK.md)

---

### 6. Security Incident

#### Symptoms
- Unauthorized access attempts
- Unusual traffic patterns
- Data exposure alerts

#### Immediate Actions

1. **Isolate affected systems**
```bash
# Block suspicious IPs at firewall level
kubectl apply -f security/block-ip.yaml

# Rotate compromised credentials
./scripts/rotate-secrets.sh
```

2. **Preserve evidence**
```bash
# Export logs
kubectl logs -n lotolink deployment/lotolink-backend --since=24h > incident-logs.txt

# Create database snapshot
kubectl exec -n lotolink deployment/postgres -- pg_dump -U lotolink > incident-backup.sql
```

3. **Notify stakeholders**
- Legal/Compliance team
- Affected users (if required)
- Regulatory bodies (if required)

---

## Post-Incident Procedures

### Immediate (Within 24 hours)
- [ ] Confirm service is stable
- [ ] Document timeline of events
- [ ] Collect all relevant logs and metrics
- [ ] Send initial incident report

### Within 3 Days
- [ ] Complete root cause analysis (RCA)
- [ ] Identify preventive measures
- [ ] Create action items with owners

### Within 1 Week
- [ ] Hold blameless post-mortem meeting
- [ ] Document lessons learned
- [ ] Update runbooks with new learnings
- [ ] Implement quick wins

---

## Useful Commands Reference

### Kubernetes
```bash
# Get all resources in namespace
kubectl get all -n lotolink

# Describe a failing pod
kubectl describe pod <pod-name> -n lotolink

# Get events
kubectl get events -n lotolink --sort-by='.lastTimestamp'

# Execute into a pod
kubectl exec -it <pod-name> -n lotolink -- /bin/sh
```

### Logs
```bash
# Get recent logs
kubectl logs -n lotolink deployment/lotolink-backend --tail=200

# Follow logs
kubectl logs -n lotolink deployment/lotolink-backend -f

# Get logs from all pods
kubectl logs -n lotolink -l app=lotolink-backend --all-containers
```

### Database
```bash
# Connect to database
kubectl exec -it -n lotolink deployment/postgres -- psql -U lotolink

# Check replication status
psql -c "SELECT * FROM pg_stat_replication"

# Check table sizes
psql -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC"
```

### Monitoring
```bash
# Check Prometheus targets
curl -s http://prometheus:9090/api/v1/targets | jq .

# Query metrics
curl -s 'http://prometheus:9090/api/v1/query?query=up' | jq .
```

---

## Appendix: Incident Report Template

```markdown
# Incident Report: [Brief Title]

**Date:** YYYY-MM-DD
**Duration:** HH:MM - HH:MM (X hours)
**Severity:** P0/P1/P2/P3
**Author:** [Name]

## Summary
Brief description of what happened.

## Timeline
- HH:MM - First alert triggered
- HH:MM - On-call acknowledged
- HH:MM - Root cause identified
- HH:MM - Mitigation applied
- HH:MM - Service restored

## Root Cause
Technical explanation of what caused the incident.

## Impact
- Number of affected users
- Revenue impact (if any)
- Data impact (if any)

## Resolution
What was done to fix the immediate issue.

## Action Items
| Item | Owner | Due Date | Status |
|------|-------|----------|--------|
| Action 1 | @person | YYYY-MM-DD | Open |
| Action 2 | @person | YYYY-MM-DD | Open |

## Lessons Learned
What we learned from this incident.
```
