# 🚀 Checklist Produção - SaaS Global Disparos

> Recomendações para escalar para **GRANDE VOLUME** com **ALTA CONFIABILIDADE**

---

## 1️⃣ PERFORMANCE & ESCALABILIDADE

### Cache Layer (Redis)
- [ ] **Implementar Redis** para cache de sesiones e dados frequentes
  - Cache de instâncias conectadas
  - Cache de grupos/contatos
  - Cache de sessões de usuário
  - TTL configurável por tipo de dado
  
- [ ] **Session Store em Redis** em vez de memória
  - `express-session` + `connect-redis`
  - Suporta múltiplos servidores

### Database Optimization
- [ ] **Índices strategic** em PostgreSQL
  - Índice em `userId` (WhatsAppInstance, Campaign, Message)
  - Índice em `instanceId` (Message, Contact)
  - Índice composto em `(userId, isActive)`
  - Índice em `createdAt` para paginação

- [ ] **Connection Pooling**
  - `max: 20` para desenvolvimento
  - `max: 50` para produção
  - Configurar em `sequelize.pool`

- [ ] **Query Optimization**
  - Evitar N+1 queries (usar `include` no Sequelize)
  - Usar `raw: true` quando não precisar de modelo
  - Pagination em listas grandes (campanhas, mensagens)

### Message Queue (Bull + Redis)
- [ ] **Enfileirar tarefas assíncronas**
  - Envio de mensagens
  - Reconexão de instâncias
  - Processamento de logs
  - Sincronização de grupos
  
- [ ] **Retry automático** para falhas temporárias
- [ ] **Dead Letter Queue** para erros persistentes
- [ ] **Monitoring** de fila (atrasos, falhas)

### Load Balancing
- [ ] **Múltiplas instâncias do backend**
  - Nginx/HAProxy com round-robin
  - Health checks automáticos
  - Sticky sessions (para WebSocket)

- [ ] **Horizontal scaling automático**
  - Docker + Kubernetes readiness probes
  - Auto-scale baseado em CPU/memória

---

## 2️⃣ SEGURANÇA

### Authentication & Authorization
- [ ] **JWT com refresh tokens**
  - Access token com 15min expiry
  - Refresh token com 7 dias
  - Blacklist de tokens revogados

- [ ] **Rate limiting por usuário**
  - `express-rate-limit`
  - 100 requests/min por IP
  - 1000 requests/hora por usuário autenticado

- [ ] **CSRF Protection**
  - Tokens CSRF para mutações POST/PUT/DELETE

### Input Validation & Sanitization
- [ ] **Validar data de request**
  - `joi` ou `zod` em todas as rotas
  - Limitar tamanho de payload (max 10MB)
  - Whitelist de campos esperados

- [ ] **Escape de strings** em logs e banco
  - Prevenir SQL injection (Sequelize já faz)
  - XSS prevention no frontend

### Data Protection
- [ ] **Hash de senhas**
  - `bcrypt` com salt 10+
  - Nunca loguear senhas completas

- [ ] **Encryption de dados sensíveis**
  - Encrypt WhatsApp tokens/auth_sessions
  - Encrypt números de telefone em backup

### HTTPS & SSL/TLS
- [ ] **Certificado SSL válido** (Let's Encrypt)
- [ ] **HSTS header** (force HTTPS)
- [ ] **Versão TLS 1.2+**

### Secrets Management
- [ ] **Não commitar .env com secrets**
  - Usar AWS Secrets Manager / GCP Secret Manager
  - Rotação automática de secrets
  - Audit log de acessos

---

## 3️⃣ MONITORING & OBSERVABILITY

### Structured Logging
- [ ] **Winston ou Pino** com níveis
  - `error`, `warn`, `info`, `debug`
  - JSON format para parsing automatizado
  - Correlation IDs para rastrear requisições

- [ ] **Log agregation** (ELK Stack / Datadog)
  - Centralize logs em 1 lugar
  - Alertas automáticos para erros críticos
  - Dashboard de logs

### Error Tracking
- [ ] **Sentry ou Rollbar**
  - Capture exceções não tratadas
  - Stack traces com source maps
  - Alertas de novos erros

### Metrics & Monitoring
- [ ] **Prometheus + Grafana**
  - Tempo de resposta por endpoint
  - Taxa de erro
  - Memória/CPU do servidor
  - Tamanho de fila

- [ ] **Application Performance Monitoring (APM)**
  - New Relic / DataDog / Elastic APM
  - Rastrear transações lentas
  - Bottlenecks identificados automaticamente

### Health Checks
- [ ] **Endpoint `/health` robusto**
  - Check DB connection
  - Check Redis connection
  - Check disk space
  - Return `503 Service Unavailable` se falhar

- [ ] **Liveness & Readiness probes** (Kubernetes)
  - `/health/live` - servidor está vivo?
  - `/health/ready` - pronto para receber requisições?

---

## 4️⃣ DATABASE

### Backups
- [ ] **Backup automático diário** (RDS automated backups)
  - Retenção 30 dias
  - Teste de restore regularmente

- [ ] **Backup incremental cada 6h**
- [ ] **Backup para S3** de forma criptografada

### Data Integrity
- [ ] **Foreign key constraints** ativa
- [ ] **Unique constraints** onde apropriado
- [ ] **Check constraints** para validações

### Migrations
- [ ] **Zero-downtime migrations**
  - Add column primeiro, depois código
  - Nunca drop columns abruptamente
  - Usar `sequelize-cli` com versionamento

### Query Performance
- [ ] **Explain plan** regularmente
- [ ] **Índices não-utilizados** removidos
- [ ] **Queries lentas** identificadas e otimizadas

---

## 5️⃣ FRONTEND

### Performance
- [ ] **Code splitting** por rota (Vite lazy load)
- [ ] **Image optimization** (WebP, lazy loading)
- [ ] **Bundle analysis** (rollup-plugin-visualizer)
- [ ] **Lighthouse score** > 90

### Error Handling
- [ ] **Error boundaries** para React
- [ ] **Fallback UI** quando API falha
- [ ] **Retry automático** com backoff exponencial
- [ ] **User-friendly error messages**

### Loading States
- [ ] **Skeleton screens** em lugar de spinners
- [ ] **Optimistic updates** quando possível
- [ ] **Cancel requests** quando usuário navega

### Progressive Web App (PWA)
- [ ] **Service worker** para offline mode
- [ ] **Manifest.json** para instalação
- [ ] **Push notifications** (opcional)
- [ ] **Add to home screen**

### Analytics
- [ ] **Google Analytics** ou Mixpanel
  - Track user behavior
  - Funnel analysis
  - Crash reporting

---

## 6️⃣ DEVOPS & INFRASTRUCTURE

### Containerization
- [ ] **Docker images** otimizadas
  - Multi-stage build
  - Usar Node Alpine (menor tamanho)
  - Scan vulnerabilidades com Trivy/Snyk

- [ ] **Docker Compose** para local dev

### Orchestration
- [ ] **Kubernetes** para produção
  - Deployments com rolling updates
  - StatefulSet para database
  - ConfigMaps para env vars
  - Secrets para sensitive data
  - HPA (Horizontal Pod Autoscaler)

### CI/CD Pipeline
- [ ] **GitHub Actions / GitLab CI**
  - Run tests no push
  - Build image Docker
  - Push para registry
  - Deploy automático em staging
  - Approval para produção

- [ ] **Automated testing** em pipeline
  - Unit tests
  - Integration tests
  - Lint + code quality

### Environment Management
- [ ] **Staging idêntico a produção**
  - Same DB schema version
  - Same Node version
  - Same dependencies

- [ ] **Feature flags** para rollout gradual
  - Controlar features por usuário/plano
  - A/B testing

### Disaster Recovery
- [ ] **RTO (Recovery Time Objective)** definido
  - Alvo: < 1 hora
- [ ] **RPO (Recovery Point Objective)** definido
  - Alvo: < 15 min de perda de dados
- [ ] **Tested disaster recovery plan**
  - Realizar simulado trimestral

---

## 7️⃣ ADVANCED FEATURES

### Multi-tenancy
- [ ] **Data isolation completa** por usuário
  - Queries sempre filtram por `userId`
  - Database-level row security (RLS)

- [ ] **Tenant-aware logging**
  - Logs incluem tenant ID

### Audit Logs
- [ ] **Auditoria de todas ações críticas**
  - Criar/deletar instância (quem, quando, IP)
  - Envio de campanha (mensagens, taxa de erro)
  - Mudança de plano/pagamento

- [ ] **Retenção**: 6+ meses
- [ ] **Imutável**: Não permitir deleção

### Soft Deletes
- [ ] **Implementar soft delete** em modelos críticos
  - WhatsAppInstance, Campaign, Contact
  - `deletedAt` timestamp

- [ ] **Restauração** de dados deletados (7+ dias)

### Data Reconciliation
- [ ] **Scheduled job** para reconciliar dados
  - Comparar status BD vs memória
  - Sincronizar grupos desincronizados
  - Cleanup de sessões antigas

- [ ] **Alertar** em inconsistência crítica

### Webhooks
- [ ] **Webhook outgoing** para eventos importantes
  - Campanha enviada
  - Campanha falhou
  - Instância desconectou
  - Novo contato adicionado

- [ ] **Retry automático** com exponential backoff
- [ ] **Signature validation** SHA-256

---

## 8️⃣ TESTING

### Unit Tests
- [ ] **Cobertura > 70%**
  - Services (campaignService, groupDispatchService)
  - Models
  - Utilities

### Integration Tests
- [ ] **Testar fluxos completos**
  - Create instance → Connect → Send message
  - Create campaign → Add contacts → Dispatch
  - Group sync

- [ ] **Testar error paths**
  - Conexão perdida durante envio
  - Usuário deletado enquanto campanha roda

### E2E Tests
- [ ] **Cypress / Playwright**
  - Login → Create instance → Connect → Send
  - Crítico: Campanha completamente

### Performance Tests
- [ ] **Load testing** com K6 / Locust
  - 100 usuários simultâneos
  - Verificar degradação
  - Identificar limites

- [ ] **Stress testing**
  - Aumentar load até quebrar
  - Medir MTTR (mean time to recovery)

---

## 9️⃣ COMPLIANCE & LEGAL

### Data Privacy
- [ ] **LGPD compliance** (Brasil)
  - Direito ao esquecimento (delete + audit)
  - Consentimento para marketing
  - Política de privacidade clara

- [ ] **GDPR** (se tiver usuários EU)
  - Data portability
  - Right to erasure
  - Data processing agreement

### Terms of Service
- [ ] **ToS clara** sobre uso de WhatsApp
  - Não usar para spam/marketing sem consentimento
  - Respeitar limites da WhatsApp
  - Responsabilidade do usuário

### Data Retention Policy
- [ ] **Deletar dados automaticamente** após período
  - Mensagens: 30 dias após envio
  - Contactos: 6 meses après inatividade
  - Logs: 90 dias

---

## 🔟 PLATFORM-SPECIFIC

### WhatsApp Integration
- [ ] **Respeitar rate limits**
  - Implementar backoff exponencial
  - Queue de mensagens com throttling

- [ ] **Handle de desconexões gracefully**
  - Retry automático em background
  - Notificar usuário se instância offline > 1h

- [ ] **Account health**
  - Detectar ban automático
  - Reduzir volume quando suspeito
  - Documentar o padrão de envio

### Phone Number Validation
- [ ] **Validar números E.164 format**
  - libphonenumber-js
  - Evitar números inválidos

- [ ] **WhatsApp availability check**
  - Usar Evolution/Baileys para verificar
  - Não enviar para bots/números fake

---

## 📊 PRIORITY MATRIX

### CRÍTICO (Fazer AGORA)
1. Rate limiting
2. Input validation (joi/zod)
3. Structured logging
4. Database backups
5. Health check endpoint
6. JWT com refresh tokens
7. Error handling robusto

### IMPORTANTE (Próx 2-4 semanas)
1. Redis cache
2. Message queue (Bull)
3. Load balancing
4. Sentry integration
5. Multi-instance support
6. Soft deletes
7. Audit logs

### NICE-TO-HAVE (1-3 meses)
1. Kubernetes
2. Feature flags
3. Webhooks
4. Analytics
5. PWA

---

## 🎯 CHECKLIST MVP PRODUÇÃO

- [ ] HTTPS/TLS ativo
- [ ] Rate limiting implementado
- [ ] Input validation em todas rotas
- [ ] JWT com refresh tokens
- [ ] Structured logging (Winston)
- [ ] Health endpoint
- [ ] Database backups automáticos
- [ ] Sentry para error tracking
- [ ] Environment variables seguras
- [ ] Database índices otimizados
- [ ] Connection pooling configurado
- [ ] Soft deletes em modelos críticos
- [ ] Audit log básico
- [ ] CORS policy tight
- [ ] Load tests (100 usuários)

---

## 📈 ESTIMATIVA

| Feature | Dias | Prioridade |
|---------|------|-----------|
| Rate Limiting | 1 | 🔴 Crítico |
| Input Validation | 2 | 🔴 Crítico |
| Structured Logging | 2 | 🔴 Crítico |
| Redis Cache | 3 | 🟠 Alto |
| Message Queue | 3 | 🟠 Alto |
| Load Testing | 2 | 🟠 Alto |
| Sentry | 1 | 🟠 Alto |
| Kubernetes | 5 | 🟡 Médio |
| Webhooks | 3 | 🟡 Médio |
| Feature Flags | 4 | 🟡 Médio |
| PWA | 2 | 🟢 Baixo |

