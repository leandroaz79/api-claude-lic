# Deploy no EasyPanel

## Configuração

1. **Criar novo serviço no EasyPanel**
   - Tipo: Docker
   - Repository: https://github.com/leandroaz79/api-claude-lic.git
   - Branch: main

2. **Configurar variáveis de ambiente**
   ```
   PORT=3000
   SUPABASE_URL=https://anpdeicypxflfwzdcpkr.supabase.co
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucGRlaWN5cHhmbGZ3emRjcGtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk1OTUwNCwiZXhwIjoyMDkzNTM1NTA0fQ._GDb3RoA7PkQaHKEm93i_uIMPrxuXwYKJgZgFknjfkM
   ROUTER_URL=http://9router:20128/v1
   ```

3. **Configurar porta**
   - Container Port: 3000
   - Public Port: 80 ou 443 (conforme preferência)

4. **Health Check**
   - Endpoint: `/health`
   - Método: GET

## Estrutura

- `Dockerfile` - Build da imagem
- `docker-compose.yml` - Configuração local
- `.dockerignore` - Arquivos ignorados no build

## Teste local com Docker

```bash
docker build -t ai-gateway .
docker run -p 3000:3000 --env-file .env ai-gateway
```

## Após deploy

Testar endpoint:
```bash
curl -X POST https://seu-dominio.com/v1/chat/completions \
  -H "Authorization: Bearer test-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```
