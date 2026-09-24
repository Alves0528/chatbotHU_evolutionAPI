const axios = require('axios');
require('dotenv').config();

const {
  EVOLUTION_API_URL,
  EVOLUTION_API_KEY,
  INSTANCE_NAME,
} = process.env;

if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !INSTANCE_NAME) {
  // eslint-disable-next-line no-console
  console.warn(
    '[evolutionApi] Atenção: variáveis de ambiente EVOLUTION_API_URL, ' +
      'EVOLUTION_API_KEY ou INSTANCE_NAME não definidas. Configure o arquivo .env.'
  );
}

const api = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    'Content-Type': 'application/json',
    apikey: EVOLUTION_API_KEY,
  },
  timeout: 15000,
});

/**
 * Normaliza o senderNumber (ex.: "5567999998888@s.whatsapp.net") para o formato
 * "number" puro que a Evolution API espera no corpo das requisições de envio.
 */
function toPlainNumber(senderNumber) {
  return String(senderNumber).split('@')[0];
}

/**
 * Envia uma mensagem de texto simples.
 * Endpoint: POST /message/sendText/{instance}
 * text: message text
 * options: lista de tuplas [id=>título]
 */
async function sendText(senderNumber, text, options = null) {
  const number = toPlainNumber(senderNumber);
  const url = `/message/sendText/${INSTANCE_NAME}`;

  text = options ? addTextMenuOptions(text, options) : text;
  const body = { number, text };
  
  try {
    const { data } = await api.post(url, body);
    return data;
  } catch (err) {
    logError('sendText', url, body, err);
    throw err;
  }
}

function addTextMenuOptions(text, options) {
  let optionsText = '\n';
  options.forEach((option, index) => {
    optionsText += `${index + 1} - ${option.title}\n`;
  });
  return text + optionsText;
}

function logError(fnName, url, body, err) {
  const status = err.response?.status;
  const data = err.response?.data;
  // eslint-disable-next-line no-console
  console.error(
    `[evolutionApi] Erro em ${fnName} -> ${url} | status=${status} |`,
    data || err.message
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  sendText,
  sleep,
  toPlainNumber,
};
