# Moacir × Sistema de Veículos AMMOC — Guia de Integração

Este documento ensina o **Moacir** (agente OpenClaw da AMMOC) a usar a API de
frotas: consultar o estado em tempo real e marcar viagens **em nome de um
funcionário**, exatamente como ele faria pelo app.

> **Persona / regra de ouro:** o Moacir nunca age "por conta própria". Toda ação
> de escrita é feita **em nome de um funcionário real**, identificado pelo
> e-mail (ou telefone) dele. Se não souber quem é o funcionário, pergunte antes.

---

## 1. Conexão e autenticação

- **Base URL:** `https://frota.ammoc.org.br/api/v1/bot`
- **Toda** requisição precisa do header de chave de serviço:
  ```
  X-API-Key: {{BOT_API_KEY}}
  ```
  (configure `{{BOT_API_KEY}}` como **segredo** no OpenClaw — nunca exponha em
  texto.)
- **Ações de escrita** (criar / iniciar / finalizar / cancelar) precisam também
  identificar o funcionário:
  ```
  X-Acting-User: <email ou telefone do funcionário>
  ```
  Ex.: `X-Acting-User: lauri@ammoc.org.br`. O funcionário precisa existir e
  estar ativo. As permissões espelham o app: **funcionário** só mexe nas
  próprias reservas; **gestor** mexe em qualquer uma.

### Convenções
- Datas/horas em **ISO 8601 UTC** (ex.: `2026-06-15T13:30:00Z`). Ao mostrar para
  o usuário, formate em pt-BR (`15/06/2026 10:30`, fuso de Brasília).
- Erros vêm como `{ "error": "mensagem" }` com o status HTTP adequado
  (`400` dados inválidos, `401` chave errada, `403` sem permissão / inativo,
  `404` não encontrado, `409` conflito de agenda, `500` erro interno).
- Quilometragem (`km_*`) é número inteiro.

---

## 2. Endpoints

### 2.1 Leitura (só `X-API-Key`)

#### `GET /status` — o que está acontecendo agora
Foto do momento. Use para "quem está viajando?", "tem alguém na rua?", "quais as
próximas viagens?".
```
GET /api/v1/bot/status
```
Resposta:
```json
{
  "gerado_em": "2026-06-12T15:00:00.000Z",
  "em_viagem": {
    "count": 1,
    "data": [ { /* Reserva (status em_andamento) com veiculo, usuario, cidade_destino */ } ]
  },
  "agendadas": {
    "count": 2,
    "data": [ { /* Reservas confirmadas futuras, ordenadas por data_saida */ } ]
  }
}
```

#### `GET /veiculos` — frota + quilometragem + em viagem agora
```
GET /api/v1/bot/veiculos
```
```json
{
  "count": 4,
  "data": [
    { "id": "...", "modelo": "Fiat Strada Volcano", "placa": "RYU6J15",
      "tipo": "caminhonete", "km_atual": 21742, "ativo": true, "em_viagem": true }
  ]
}
```

#### `GET /reservas` — lista de reservas (com filtros)
Filtros opcionais (query string), combináveis:
- `status` = `confirmada` | `em_andamento` | `finalizada` | `cancelada`
- `funcionario` = e-mail do funcionário dono da reserva
- `inicio`, `fim` = ISO; janela sobre `data_saida`
```
GET /api/v1/bot/reservas?status=confirmada&funcionario=lauri@ammoc.org.br
```
```json
{ "count": 3, "data": [ { /* Reserva com joins */ } ] }
```

#### `GET /cidades` — destinos cadastrados
```
GET /api/v1/bot/cidades
```
```json
{ "count": 12, "data": [ { "id": "513f...", "nome": "Água Doce" } ] }
```

#### `GET /disponibilidade` — o carro está livre no período?
Todos obrigatórios:
- `veiculo_id`, `inicio` (ISO), `fim` (ISO)
```
GET /api/v1/bot/disponibilidade?veiculo_id=...&inicio=2026-06-15T13:00:00Z&fim=2026-06-15T18:00:00Z
```
```json
{ "disponivel": true }
```

### 2.2 Escrita (`X-API-Key` **+** `X-Acting-User`)

#### `POST /reservas` — agendar viagem
Body (JSON):
| campo | obrig. | descrição |
|---|---|---|
| `veiculo_id` | sim | id do veículo (ver `GET /veiculos`) |
| `data_saida` | sim | ISO |
| `data_retorno_prevista` | sim | ISO, posterior à saída |
| `cidade_destino_id` **ou** `cidade_destino_nome` | sim | destino — **prefira o id** (ver §4) |
| `servico` | sim | finalidade da viagem (texto) |
| `endereco_destino` | não | local dentro da cidade |
| `reservado_para` | não | **beneficiário/passageiro**, quando a viagem é para outra pessoa |

```
POST /api/v1/bot/reservas
X-Acting-User: lauri@ammoc.org.br
{
  "veiculo_id": "e14ba727-9be1-405a-b318-00a720ba0dc9",
  "data_saida": "2026-06-20T12:00:00Z",
  "data_retorno_prevista": "2026-06-20T20:00:00Z",
  "cidade_destino_id": "513f1156-562d-4c56-9cf9-ee3260c91039",
  "servico": "Levar equipe à reunião na prefeitura",
  "reservado_para": "Dra. Marina (Secretaria de Saúde)"
}
```
Sucesso: **201** com a reserva criada (status `confirmada`, `km_saida` já
preenchido com a km atual do veículo). Conflito de agenda: **409**.

#### `PATCH /reservas/{id}/iniciar` — marcar saída
Só funciona se a reserva estiver `confirmada` → vira `em_andamento`. Sem body.
```
PATCH /api/v1/bot/reservas/{id}/iniciar
X-Acting-User: lauri@ammoc.org.br
```

#### `PATCH /reservas/{id}/finalizar` — marcar retorno
Body: `{ "km_retorno": 21850, "observacoes": "opcional" }`.
`km_retorno` precisa ser ≥ `km_saida`. **Ao finalizar, a km do veículo é
atualizada automaticamente** para o `km_retorno`.
```
PATCH /api/v1/bot/reservas/{id}/finalizar
X-Acting-User: lauri@ammoc.org.br
{ "km_retorno": 21850 }
```

#### `DELETE /reservas/{id}` — cancelar
Não cancela viagem já `finalizada`.
```
DELETE /api/v1/bot/reservas/{id}
X-Acting-User: lauri@ammoc.org.br
```
Sucesso: `{ "ok": true }`.

---

## 3. Modelos de dados

**Reserva** (campos principais):
`id`, `veiculo_id`, `usuario_id`, `data_saida`, `data_retorno_prevista`,
`data_retorno_real`, `destino` (texto "Cidade — endereço"), `cidade_destino_id`,
`endereco_destino`, `servico`, `reservado_para`, `km_saida`, `km_retorno`,
`observacoes`, `status`, `criado_em`, `atualizado_em`.
Nas leituras vem aninhado: `veiculo {}`, `usuario {}`, `cidade_destino {}`.

- `usuario` = quem **marcou** a reserva. `reservado_para` (texto) = para **quem**
  é a viagem, se diferente. Ao responder, diga ambos quando `reservado_para`
  estiver preenchido (ex.: "marcada por Lauri, para a Dra. Marina").

**Veiculo:** `id`, `placa`, `modelo`, `ano`, `tipo`
(`carro|van|caminhonete|onibus|outro`), `km_atual`, `ativo`. Em `GET /veiculos`
tem também `em_viagem` (boolean).

**Usuario:** `id`, `email`, `nome`, `papel` (`funcionario|gestor`), `cargo`,
`telefone`, `ativo`.

**Cidade:** `id`, `nome`.

**status da reserva:** `confirmada` (agendada) → `em_andamento` (saiu) →
`finalizada` (voltou) · ou `cancelada`.

---

## 4. Cidade de destino — id vs nome (evite duplicatas!)
Para o destino você pode mandar `cidade_destino_id` **ou** `cidade_destino_nome`:
- **Recomendado:** chame `GET /cidades`, encontre a cidade pelo nome e use o
  `id`. É à prova de erro de digitação.
- Se mandar `cidade_destino_nome`, o sistema casa pelo nome (ignorando
  maiúsculas/acentos exatos) e, **se não encontrar, CRIA uma cidade nova**. Isso
  pode gerar duplicatas ("Joaçaba" vs "Joacaba"). Só use o nome quando tiver
  certeza da grafia, ou confirme com o usuário antes.

---

## 5. Fluxos típicos

**"Quem está viajando agora?"** → `GET /status`, leia `em_viagem.data`: para cada
um diga funcionário, veículo (modelo+placa), destino e desde quando.

**"Agendar o Onix pra Água Doce amanhã 9h–17h, pro João"** →
1. `GET /veiculos` (pegar `veiculo_id` do Onix) e `GET /cidades` (id de Água Doce).
2. (opcional) `GET /disponibilidade` no período.
3. `POST /reservas` com `X-Acting-User` = quem pediu, `reservado_para: "João"`.

**"Saí com o carro"** → ache a reserva (`GET /reservas?funcionario=...&status=confirmada`)
e `PATCH .../iniciar`.

**"Voltei, deu 21850 km"** → `PATCH .../finalizar` com `km_retorno: 21850`.

**"Cancela minha viagem de sexta"** → ache o `id` e `DELETE /reservas/{id}`.

---

## 6. Boas práticas para o Moacir
- Sempre confirme **em nome de quem** está agendando (header `X-Acting-User`).
- Repasse os erros de forma amigável (ex.: 409 = "esse carro já está reservado
  nesse horário, quer outro horário ou outro veículo?").
- Ao finalizar, lembre o usuário de informar a **km do painel** — ela atualiza a
  km do veículo.
- Use `reservado_para` sempre que a viagem for para outra pessoa.
