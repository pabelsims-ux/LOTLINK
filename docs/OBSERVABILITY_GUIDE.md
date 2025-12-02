# Observability Configuration Guide

## Overview

This guide covers the setup and configuration of observability tools for the Lotolink platform.

## Architecture

```
                    ┌─────────────────┐
                    │   Application   │
                    │   (NestJS)      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │  Logs    │   │ Metrics  │   │ Traces   │
       │ (stdout) │   │ (/metrics)│  │(optional)│
       └────┬─────┘   └────┬─────┘   └────┬─────┘
            │              │              │
            ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │ Loki     │   │Prometheus│   │  Jaeger  │
       └────┬─────┘   └────┬─────┘   └────┬─────┘
            │              │              │
            └──────────────┼──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Grafana    │
                    └──────────────┘
```

## Components

### 1. Prometheus (Metrics)

Prometheus collects and stores time-series metrics from the application.

#### Docker Compose Configuration

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.45.0
    container_name: lotolink-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./monitoring/prometheus/alerts/:/etc/prometheus/alerts/:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    networks:
      - monitoring

volumes:
  prometheus_data:

networks:
  monitoring:
    name: lotolink-monitoring
```

#### Prometheus Configuration

```yaml
# monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

rule_files:
  - /etc/prometheus/alerts/*.yml

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'lotolink-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/metrics'
    
  - job_name: 'mock-banca'
    static_configs:
      - targets: ['mock-banca:4000']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'rabbitmq'
    static_configs:
      - targets: ['rabbitmq:15692']
```

#### Alert Rules

```yaml
# monitoring/prometheus/alerts/lotolink.yml
groups:
  - name: lotolink_alerts
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          (sum(rate(http_requests_total{status=~"5.."}[5m])) 
           / sum(rate(http_requests_total[5m]))) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for more than 5 minutes"

      # Slow response times
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time detected"
          description: "95th percentile response time is above 2 seconds"

      # High pending plays
      - alert: HighPendingPlays
        expr: plays_status_total{status="pending"} > 50
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Too many pending plays"
          description: "More than 50 plays stuck in pending status"

      # Webhook failures
      - alert: WebhookHighFailureRate
        expr: |
          (sum(rate(webhook_requests_total{status="error"}[5m])) 
           / sum(rate(webhook_requests_total[5m]))) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Webhook failure rate above 5%"

      # Database connection issues
      - alert: DatabaseConnectionErrors
        expr: rate(database_errors_total[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection errors detected"

      # Redis connection issues
      - alert: RedisConnectionErrors
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"

      # Service down
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
```

### 2. Grafana (Visualization)

Grafana provides dashboards and alerting visualization.

#### Docker Compose Configuration

```yaml
# Add to docker-compose.monitoring.yml
  grafana:
    image: grafana/grafana:10.0.0
    container_name: lotolink-grafana
    ports:
      - "3001:3000"
    volumes:
      - ./monitoring/grafana/provisioning/:/etc/grafana/provisioning/:ro
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=http://localhost:3001
    depends_on:
      - prometheus
    networks:
      - monitoring

volumes:
  grafana_data:
```

#### Datasource Configuration

```yaml
# monitoring/grafana/provisioning/datasources/datasources.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false
```

### 3. Application Metrics Integration

#### NestJS Metrics Setup

```typescript
// src/infrastructure/metrics/prometheus.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class PrometheusService {
  private readonly registry: Registry;
  private readonly httpRequestDuration: Histogram;
  private readonly httpRequestsTotal: Counter;
  private readonly playsStatusGauge: Gauge;
  private readonly webhookRequestsTotal: Counter;

  constructor() {
    this.registry = new Registry();
    
    // Collect default Node.js metrics
    collectDefaultMetrics({ register: this.registry });

    // HTTP request duration
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    // HTTP requests counter
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    // Plays by status gauge
    this.playsStatusGauge = new Gauge({
      name: 'plays_status_total',
      help: 'Number of plays by status',
      labelNames: ['status'],
      registers: [this.registry],
    });

    // Webhook requests counter
    this.webhookRequestsTotal = new Counter({
      name: 'webhook_requests_total',
      help: 'Total number of webhook requests',
      labelNames: ['status', 'type'],
      registers: [this.registry],
    });
  }

  recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    const status = statusCode >= 400 ? 'error' : 'success';
    this.httpRequestDuration.labels(method, route, statusCode.toString()).observe(durationMs / 1000);
    this.httpRequestsTotal.labels(method, route, status).inc();
  }

  recordWebhook(status: 'success' | 'error', type: string): void {
    this.webhookRequestsTotal.labels(status, type).inc();
  }

  setPlaysStatus(status: string, count: number): void {
    this.playsStatusGauge.labels(status).set(count);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
```

#### Metrics Controller

```typescript
// src/infrastructure/http/controllers/metrics.controller.ts
import { Controller, Get, Header } from '@nestjs/common';
import { PrometheusService } from '../../metrics/prometheus.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly prometheusService: PrometheusService) {}

  @Get()
  @Header('Content-Type', 'text/plain')
  async getMetrics(): Promise<string> {
    return this.prometheusService.getMetrics();
  }
}
```

### 4. Sentry (Error Tracking)

#### Installation

```bash
npm install @sentry/node @sentry/tracing
```

#### Configuration

```typescript
// src/infrastructure/sentry/sentry.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    const environment = this.configService.get<string>('NODE_ENV', 'development');

    if (dsn) {
      Sentry.init({
        dsn,
        environment,
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
        ],
      });
    }
  }

  captureException(error: Error, context?: Record<string, unknown>): void {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setExtras(context);
      }
      Sentry.captureException(error);
    });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    Sentry.captureMessage(message, level);
  }

  setUser(user: { id: string; email?: string }): void {
    Sentry.setUser(user);
  }
}
```

#### Sentry Exception Filter

```typescript
// src/infrastructure/sentry/sentry.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { SentryService } from './sentry.service';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  constructor(private readonly sentryService: SentryService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const status = exception instanceof HttpException ? exception.getStatus() : 500;

    // Capture 5xx errors in Sentry
    if (status >= 500) {
      this.sentryService.captureException(exception as Error, {
        url: request.url,
        method: request.method,
        body: request.body,
        headers: request.headers,
      });
    }

    response.status(status).json({
      statusCode: status,
      message: exception instanceof HttpException ? exception.message : 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### 5. Loki (Log Aggregation)

#### Docker Compose Configuration

```yaml
# Add to docker-compose.monitoring.yml
  loki:
    image: grafana/loki:2.8.0
    container_name: lotolink-loki
    ports:
      - "3100:3100"
    volumes:
      - ./monitoring/loki/loki-config.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - monitoring

  promtail:
    image: grafana/promtail:2.8.0
    container_name: lotolink-promtail
    volumes:
      - ./monitoring/promtail/promtail-config.yml:/etc/promtail/config.yml:ro
      - /var/log:/var/log:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - monitoring

volumes:
  loki_data:
```

#### Loki Configuration

```yaml
# monitoring/loki/loki-config.yml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2020-05-15
      store: boltdb
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 168h

storage_config:
  boltdb:
    directory: /loki/index
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
```

## Grafana Dashboards

### Dashboard IDs to Import

1. **Node.js Application Dashboard**: 11159
2. **PostgreSQL Dashboard**: 9628
3. **Redis Dashboard**: 763
4. **RabbitMQ Dashboard**: 10991

### Custom Lotolink Dashboard

Create a custom dashboard with these panels:

1. **Request Rate**: Rate of incoming requests
2. **Error Rate**: Percentage of 4xx/5xx responses
3. **Response Time P95**: 95th percentile latency
4. **Plays by Status**: Gauge of pending/confirmed/rejected plays
5. **Webhook Success Rate**: Rate of successful webhook deliveries
6. **Database Connections**: Active DB connections
7. **Redis Hits/Misses**: Cache efficiency

## Alert Channels

### Slack Integration

```yaml
# alertmanager.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/XXX/XXX/XXX'

route:
  receiver: 'slack-notifications'
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true
        title: '{{ .Status | toUpper }}: {{ .GroupLabels.alertname }}'
        text: >-
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Severity:* {{ .Labels.severity }}
          {{ end }}
```

### PagerDuty Integration

```yaml
receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '<PAGERDUTY_SERVICE_KEY>'
        severity: critical
```

## Environment Variables

Add these to your `.env` file:

```bash
# Monitoring
METRICS_ENABLED=true
METRICS_PORT=9090

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Kubernetes Deployment

For Kubernetes deployments, use the kube-prometheus-stack Helm chart:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus prometheus-community/kube-prometheus-stack
```

Configure ServiceMonitor for Lotolink:

```yaml
# k8s/monitoring/service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: lotolink-backend
  labels:
    release: kube-prometheus
spec:
  selector:
    matchLabels:
      app: lotolink-backend
  endpoints:
    - port: http
      path: /metrics
      interval: 15s
```

## Runbook Integration

Link alerts to runbooks by adding annotations:

```yaml
annotations:
  runbook_url: https://github.com/org/lotolink/docs/runbooks/INCIDENT_RESPONSE.md
```
