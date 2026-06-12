# API do Bot (OpenClaw) — Sistema de Veículos AMMOC

**Data:** 2026-06-12
**Status:** Aprovado para implementação

## Objetivo

Expor uma API HTTP que permita a um agente OpenClaw fazer **tudo o que um
funcionário faz** no sistema de frotas — consultar quem está em viagem agora,
viagens agendadas, veículos e quilometragem, e executar as ações de marcação
(criar, iniciar, finalizar, cancelar reserva) — agindo **em nome de um
funcionário real**, com rastreabilidade.

## Decisões

- **Plataforma:** OpenClaw (agente que chama HTTP). Identificador do
  funcionário é genérico: **e-mail ou telefone**.
- **Autenticação em 2 camadas:**
  1. `X-API-Key: <BOT_API_KEY>` — chave de serviço própria do bot (env nova,
     separada de `EXPORT_API_KEY`, com permissão de escrita).
  2. `X-Acting-User: <email|telefone>` — funcionário em nome de quem o bot age.
     Resolvido contra `usuarios` (deve estar `ativo`). Todas as ações de escrita
     são atribuídas a esse `usuario_id` e seguem **as mesmas regras de permissão
     do app**: funcionário só mexe nas próprias reservas; gestor em qualquer uma.
- **"Reservado para"** (`reservas.reservado_para`, texto nullable): quando a
  viagem é para outra pessoa que não quem está marcando, o bot informa o
  beneficiário. Opcional ("se for o caso"). Surge em todas as leituras.
- **Sem migration para telefone:** `usuarios.telefone` já existe.
- **Fonte única de verdade:** a lógica de criar/iniciar/finalizar/cancelar é
  extraída para `lib/reservas/actions.ts`. As rotas do funcionário (app) **e** as
  do bot chamam as mesmas funções — nunca divergem.

## Mudança de schema

```sql
-- 010_add_reservado_para.sql
ALTER TABLE reservas ADD COLUMN reservado_para text;
```

## Componentes

### `lib/bot-auth.ts`
- `requireBotKey(req): NextResponse | null` — valida `X-API-Key` vs `BOT_API_KEY`.
- `resolveActingUser(req, supabase): Promise<{ user } | { response }>` — lê
  `X-Acting-User`, busca `usuarios` por e-mail (case-insensitive) ou telefone,
  exige `ativo`. 400 se header ausente, 404 se não encontrado/inativo.

### `lib/reservas/actions.ts` (funções compartilhadas)
Assinatura: `(supabase, user: Usuario, input) => Promise<{ data } | { error, status }>`
- `criarReserva(supabase, user, input)` — validações, checagem de conflito,
  `km_saida = veiculo.km_atual`, `status='confirmada'`, grava `reservado_para`,
  dispara e-mail de confirmação (fire-and-forget, como hoje). Retorna reserva com joins.
- `iniciarViagem(supabase, user, id)` — exige status `confirmada` → `em_andamento`.
- `finalizarViagem(supabase, user, id, { km_retorno, observacoes })` — valida
  `km_retorno`, atualiza reserva e `veiculos.km_atual`.
- `cancelarReserva(supabase, user, id)` — `status='cancelada'` (não finalizada).

As 4 rotas existentes do app passam a ser cascas finas que chamam essas funções.

## Endpoints — `/api/v1/bot/*`

Todos exigem `X-API-Key`. As de escrita exigem também `X-Acting-User`.

**Leitura**
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/bot/status` | `em_viagem` (status=em_andamento, com funcionário, veículo, destino, km_saida, desde quando) + `agendadas` (confirmada, data_saida ≥ agora) |
| GET | `/api/v1/bot/veiculos` | Veículos com `km_atual` e flag `em_viagem` no momento |
| GET | `/api/v1/bot/reservas?status=&funcionario=&inicio=&fim=` | Lista de reservas com joins (veículo, funcionário, cidade, `reservado_para`) |
| GET | `/api/v1/bot/disponibilidade?veiculo_id=&inicio=&fim=` | `{ disponivel: boolean }` |

**Escrita**
| Método | Rota | Ação |
|---|---|---|
| POST | `/api/v1/bot/reservas` | Criar (`veiculo_id, data_saida, data_retorno_prevista, cidade_destino_id, servico`, opcionais `endereco_destino`, `reservado_para`) |
| PATCH | `/api/v1/bot/reservas/{id}/iniciar` | Marcar saída |
| PATCH | `/api/v1/bot/reservas/{id}/finalizar` | `{ km_retorno, observacoes? }` |
| DELETE | `/api/v1/bot/reservas/{id}` | Cancelar |

## Respostas

JSON estruturado. Timestamps em ISO (o agente formata). Erros: `{ error: string }`
com status apropriado (400/401/403/404/409/500), iguais aos do app.

## Segurança

`BOT_API_KEY` permite agir como **qualquer** funcionário via `X-Acting-User` —
inerente ao modelo "chave de serviço + identificador" escolhido. Manter a chave
secreta no OpenClaw. Acting-user inexistente/inativo é rejeitado.

## Fora de escopo

- Cadastro/edição de veículos e usuários pelo bot.
- Webhooks/push do sistema para o bot (só request/response).
- Mapa de telefone→funcionário automático (telefone é preenchido manualmente).

## Verificação

`npx tsc --noEmit` em `apps/web` limpo; rotas existentes do app continuam
funcionando após a extração da lógica compartilhada.
