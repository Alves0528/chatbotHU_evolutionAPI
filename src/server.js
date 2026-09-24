/**
 * server.js
 * -----------------------------------------------------------------------
 * Inicialização do servidor Express que expõe o endpoint de webhook para
 * a Evolution API.
 * -----------------------------------------------------------------------
 */

require('dotenv').config();
const express = require('express');
const { processWebhookEvent } = require('./webhookHandler');

const app = express();
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3000;

// Rota de health-check simples
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'ambulatorio-hu-chatbot' });
});

// Rota principal do webhook, configurada na Evolution API
app.post('/webhook', async (req, res) => {
  console.log('--- Webhook recebido ---', new Date().toISOString());
  console.log(JSON.stringify(req.body, null, 2));

  // Responde 200 imediatamente para a Evolution API não re-tentar o envio
  res.sendStatus(200);

  try {
    await processWebhookEvent(req.body);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[webhook] Erro ao processar evento:', err.message);
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Servidor do chatbot Ambulatório HU rodando na porta ${PORT}`);
});
