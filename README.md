# Chatbot WhatsApp — Ambulatório HU (Evolution API)

Servidor de webhook em Node.js/Express que conduz o fluxo de atendimento do
Ambulatório HU (remarcação, cancelamento e consulta de consultas) via
WhatsApp, integrado à **Evolution API**, usando menus numéricos em texto.
---

## 1. Tecnologias e versões

| Tecnologia | Versão | Observação |
|---|---|---|
| **Node.js** | 22.x LTS ou 24.x LTS | Evite Node 18/20 — saindo de manutenção. Confirme com `node --version`. |
| **npm** | vem junto com o Node | Confirme com `npm --version`. |
| **nodemon** (dev) | `^3.1.4` | Opcional, só para `npm run dev`. |
| **Evolution API** (imagem Docker) | `evoapicloud/evolution-api:v2.3.7` | Confirmada funcionando nos testes. |
| **PostgreSQL** | 16-alpine | Armazena dados da instância (Evolution API). |
| **Redis** | 7-alpine | Cache da Evolution API. |
| **Docker Desktop** | mais recente disponível | Precisa estar aberto e rodando (ícone da baleia parado na bandeja do sistema) antes de qualquer comando `docker`. |
| **Ngrok** | mais recente | Expõe a porta local do bot para a internet. |

---

## 2. Estrutura do projeto

```
ambulatorio-hu-bot\
├── package.json
├── .env.example
├── README.md
├── AGENTS.md
└── src\
    ├── server.js          # servidor Express e rota /webhook
    ├── flow.js            # definição das páginas / máquina de estados (menu numérico)
    ├── sessionManager.js  # sessão em memória por senderNumber
    ├── evolutionApi.js    # envio de texto para a Evolution API
    └── webhookHandler.js  # roteamento, allowlist e máquina de estados

evolution-api-server\        # pasta separada, fora do bot
├── .env
└── docker-compose.yml
```

---

## 3. Pré-requisitos

1. **Docker Desktop** instalado. Baixe em https://www.docker.com/products/docker-desktop/
2. **Node.js** 22 LTS ou 24 LTS. Baixe em https://nodejs.org
3. **Ngrok** instalado e com conta criada (a versão gratuita atende). Baixe
   em https://ngrok.com/download
4. Um número de WhatsApp separado para conectar na instância — (Não se preocupe não vai responder mensagem de todos apenas do que vc deixar no allowedNumber no env)

---

## 4. Parte 1 — Subindo a Evolution API (Docker)

Crie a pasta `evolution-api-server` (separada da pasta do bot) e coloque
os dois arquivos abaixo dentro dela.

**`.env`**:

```dotenv
AUTHENTICATION_API_KEY=troque-por-uma-chave-forte-aleatoria
SERVER_URL=http://localhost:8080

DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:evolution@postgres:5432/evolution
DATABASE_URL=postgresql://evolution:evolution@postgres:5432/evolution
DATABASE_SAVE_DATA_INSTANCE=true

CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://redis:6379/6
```

Só em produção pode deixar `troque-por-uma-chave-forte-aleatoria` como chave

```powershell
[guid]::NewGuid().ToString()
```

**`docker-compose.yml`**:

```yaml
services:
  evolution-api:
    image: evoapicloud/evolution-api:v2.3.7
    container_name: evolution_api
    restart: always
    ports:
      - "8080:8080"
    env_file:
      - .env
    volumes:
      - evolution_instances:/evolution/instances
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    container_name: evolution_postgres
    restart: always
    environment:
      POSTGRES_DB: evolution
      POSTGRES_USER: evolution
      POSTGRES_PASSWORD: evolution
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: evolution_redis
    restart: always
    volumes:
      - redis_data:/data

volumes:
  evolution_instances:
  postgres_data:
  redis_data:
```

> A linha `version: '3.9'` no topo do arquivo é opcional — o Docker
> Compose atual a considera obsoleta e mostra um warning no console, mas
> isso não afeta o funcionamento.

No PowerShell, dentro da pasta `evolution-api-server`:

```powershell
docker compose up -d
docker compose logs -f evolution-api
```

**Erros comuns nesse passo:**
- `unable to get image ... dockerDesktopLinuxEngine`: o Docker Desktop não
  está aberto. Abra o app e espere o ícone da baleia (na bandeja do
  sistema, perto do relógio) ficar parado antes de repetir o comando.
- `pull access denied for atendai/evolution-api`: essa imagem foi
  descontinuada — use `evoapicloud/evolution-api`, como já está no
  `docker-compose.yml` acima.

---

## 5. Parte 2 — Criando e conectando a instância no Manager

1. Acesse **http://localhost:8080/manager** no navegador.
2. Faça login com o valor de `AUTHENTICATION_API_KEY` do `.env`.
3. Crie uma nova instância (ex.: nome `ambulatorio-hu`) — anote esse nome
   exatamente como digitado, será o `INSTANCE_NAME` do bot.
4. Deixe o tipo de conexão como Baileys/WhatsApp Web (padrão) e confirme.
5. Escaneie o QR Code com o WhatsApp de teste (WhatsApp > Aparelhos
   conectados > Conectar um aparelho).
6. Confirme que o status da instância ficou `open`/conectado.
7. Ainda no Manager, vá em **Events → Webhook** e configure:
   - **Enabled**: ligado
   - **URL**: deixe em branco por enquanto — só vamos ter a URL do Ngrok
     na Parte 4
   - **Webhook by Events**: desligado
   - Marque o evento **MESSAGES_UPSERT**

---

## 6. Parte 3 — Configurando e rodando o bot

No PowerShell, na raiz do projeto do bot (`ambulatorio-hu-bot`):

```powershell
npm install
```

Crie o `.env` a partir do `.env.example`:

```powershell
copy .env.example .env
```

Abra o `.env` e preencha:

```dotenv
PORT=3000
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=mesmo_valor_do_AUTHENTICATION_API_KEY
INSTANCE_NAME=ambulatorio-hu
ALLOWED_NUMBER=55SEUNUMEROAQUI
```

`ALLOWED_NUMBER` é o número (formato `55DDDNNNNNNNNN`, sem `+`, sem
espaço) que terá permissão de testar o bot enquanto ele está em
desenvolvimento — qualquer outro remetente é ignorado.

Suba o servidor:

```powershell
npm start
```

ou, para reiniciar automaticamente a cada alteração de código:

```powershell
npm run dev
```

Deve aparecer: `Servidor do chatbot Ambulatório HU rodando na porta 3000`.
Deixe esse terminal aberto.

---

## 7. Parte 4 — Expondo com Ngrok e configurando o Webhook

Em outro terminal PowerShell:

```powershell
ngrok http 3000
```

Copie a URL `https://...ngrok-free.app` (ou `.dev`, dependendo da conta)
que aparecer.

Volte ao Manager (http://localhost:8080/manager), na instância criada, em
**Events → Webhook**, e preencha a **URL** com:

```
https://sua-url-do-ngrok/webhook
```

Salve. Para conferir se ficou certo:

```powershell
curl.exe "http://localhost:8080/webhook/find/ambulatorio-hu" -H "apikey: SUA_API_KEY"
```

A resposta deve trazer `"enabled": true` e `"events": ["MESSAGES_UPSERT"]`.

> A URL do Ngrok muda toda vez que você reinicia o `ngrok http 3000` na
> conta gratuita — atualize a URL no webhook do Manager sempre que isso
> acontecer.

---

## 8. Parte 5 — Testando

Pelo WhatsApp do número configurado em `ALLOWED_NUMBER`, mande qualquer
mensagem para o número conectado na instância. O bot deve responder com a
primeira etapa do fluxo (escolha de idioma, em menu numérico).

Acompanhe o terminal do `npm start`/`npm run dev` — qualquer erro de
processamento aparece ali.
