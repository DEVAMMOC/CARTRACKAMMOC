# API pública AMMOC Frotas

API de leitura para consumo externo (Power BI, scripts internos, sistemas irmãos).

**Base URL**: `https://cartrackammoc-git-main-maxmooshammer-6729s-projects.vercel.app`
**Auth**: header `X-API-Key: <sua-chave>` em todas as chamadas.
**Formato**: JSON UTF-8.

A chave é configurada em `EXPORT_API_KEY` (Vercel env vars). Gere uma nova com:

```bash
node -e "console.log('ammoc_' + require('crypto').randomBytes(32).toString('base64url'))"
```

## Endpoints

### `GET /api/v1/export/veiculos`

Lista TODOS os veículos (ativos + inativos).

```bash
curl -H "X-API-Key: $AMMOC_KEY" \
  https://cartrackammoc-git-main-maxmooshammer-6729s-projects.vercel.app/api/v1/export/veiculos
```

**Response:**
```json
{
  "count": 4,
  "data": [
    {
      "id": "uuid",
      "placa": "ABC1D23",
      "modelo": "Chevrolet Onix",
      "ano": 2023,
      "tipo": "carro",
      "km_atual": 15500,
      "foto_url": null,
      "ativo": true,
      "criado_em": "2026-05-01T12:00:00Z",
      "atualizado_em": "2026-05-15T10:30:00Z"
    }
  ]
}
```

### `GET /api/v1/export/reservas`

Lista reservas com veículo e usuário aninhados.

**Query params (opcionais):**
- `status` — filtra por status (`confirmada`, `em_andamento`, `finalizada`, `cancelada`)
- `inicio` — ISO datetime; retorna apenas reservas com `data_saida >= inicio`
- `fim` — ISO datetime; retorna apenas reservas com `data_saida <= fim`

```bash
# Todas as reservas de maio/2026
curl -H "X-API-Key: $AMMOC_KEY" \
  "https://cartrackammoc-git-main-maxmooshammer-6729s-projects.vercel.app/api/v1/export/reservas?inicio=2026-05-01&fim=2026-05-31"
```

**Response:**
```json
{
  "count": 1,
  "data": [
    {
      "id": "uuid",
      "veiculo_id": "uuid",
      "usuario_id": "uuid",
      "data_saida": "2026-05-18T07:52:00Z",
      "data_retorno_prevista": "2026-05-20T07:44:00Z",
      "data_retorno_real": "2026-05-20T08:12:00Z",
      "destino": "Florianópolis",
      "servico": "Reunião AMURES",
      "km_saida": 15500,
      "km_retorno": 15820,
      "observacoes": null,
      "status": "finalizada",
      "veiculo": { "id": "...", "modelo": "Chevrolet Onix", "placa": "ABC1D23", ... },
      "usuario": { "id": "...", "nome": "Max Mooshammer", "email": "...", "papel": "gestor", ... }
    }
  ]
}
```

### `GET /api/v1/export/disponibilidade?veiculo_id=&inicio=&fim=`

Checa disponibilidade de um veículo num intervalo.

**Query params (obrigatórios):**
- `veiculo_id` — UUID do veículo
- `inicio` — ISO datetime (data_saida desejada)
- `fim` — ISO datetime (data_retorno desejada)

```bash
curl -H "X-API-Key: $AMMOC_KEY" \
  "https://cartrackammoc-git-main-maxmooshammer-6729s-projects.vercel.app/api/v1/export/disponibilidade?veiculo_id=abc-123&inicio=2026-06-01T08:00&fim=2026-06-01T18:00"
```

**Response:**
```json
{
  "disponivel": false,
  "conflitos": [
    {
      "id": "uuid",
      "data_saida": "2026-06-01T07:00:00Z",
      "data_retorno_prevista": "2026-06-01T19:00:00Z",
      "status": "confirmada"
    }
  ]
}
```

## Erros

| HTTP | Significado |
|---|---|
| 200 | OK |
| 400 | Faltam query params obrigatórios |
| 401 | `X-API-Key` ausente ou inválida |
| 500 | Erro no servidor / `EXPORT_API_KEY` não configurada |

## Power BI — exemplo de conexão

No Power BI Desktop:

1. **Obter dados → Web → Avançado**
2. URL: `https://cartrackammoc-git-main-maxmooshammer-6729s-projects.vercel.app/api/v1/export/reservas`
3. Em **Cabeçalhos HTTP**, adicionar:
   - Nome: `X-API-Key`
   - Valor: (sua chave)
4. **OK** → Navegador → expandir `data` para virar tabela
5. **Atualizar** automático no Power BI Service: configure as credenciais como **Anonymous** e habilite "Skip test connection"

## Rotação de chave

Para revogar uma chave comprometida:

1. Gere nova chave (comando no topo deste doc)
2. Vercel Dashboard → cartrackammoc → Settings → Environment Variables → editar `EXPORT_API_KEY`
3. Redeploy
4. Atualize todos os consumidores com a nova chave

A chave antiga para de funcionar instantaneamente após o redeploy.
