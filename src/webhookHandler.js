/**
 * webhookHandler.js
 * -----------------------------------------------------------------------
 * Recebe os eventos do webhook da Evolution API (MESSAGES_UPSERT), extrai
 * a mensagem do usuário (texto, clique em botão ou seleção de lista) e
 * conduz a máquina de estados definida em flow.js.
 * -----------------------------------------------------------------------
 */

const evolutionApi = require('./evolutionApi');
const { getPage, START_PAGE } = require('./flow');
const {
  getSession,
  setPage,
  setData,
  resetSession,
} = require('./sessionManager');

// -------------------------------------------------------------------------
// Validadores simples para os campos de texto coletados no fluxo
// -------------------------------------------------------------------------
const validators = {
  cpf: (value) => /^\d{11}$/.test(value.replace(/\D/g, '')),

  data: (value) => {
    // 1. Verifica o formato DD/MM/AAAA
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value.trim())) return false;

    // 2. Separa dia, mês e ano para criar o objeto Date
    const [day, month, year] = value.trim().split('/');
    const dateProvided = new Date(year, month - 1, day);
    
    // 3. Pega a data de hoje e zera as horas para comparar apenas os dias
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 4. Retorna true apenas se a data informada for maior ou igual a hoje
    return dateProvided > today;
  },

  dateTime: (value) => {
    // Captura os blocos de números aceitando espaço ou a palavra "às" entre a data e a hora
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+às\s+|\s+)(\d{2}):(\d{2})$/i;
    const match = value.trim().match(regex);

    if (!match) return false;

    // Desestrutura os valores encontrados pela expressão regular
    const [, dia, mes, ano, hora, minuto] = match;
    const dataConsulta = new Date(ano, mes - 1, dia, hora, minuto);

    // Valida se a data é real (evita dias como 31/02 ou meses como 13)
    if (
      dataConsulta.getFullYear() != ano ||
      dataConsulta.getMonth() != mes - 1 ||
      dataConsulta.getDate() != dia ||
      dataConsulta.getHours() != hora ||
      dataConsulta.getMinutes() != minuto
    ) {
      return false;
    }

    // Compara com o exato momento atual para garantir que a consulta ainda vai acontecer
    const agora = new Date();
    return dataConsulta > agora;
  },

};

const validationDateTime = (value) => {
  
}

const validationMessages = {
  cpf: 'CPF inválido. Digite apenas os 11 números, sem pontos ou traços (ex.: 01234567899).',
  data: 'Data inválida ou já ultrapassada. Use uma data futura no formato DD/MM/AAAA (ex.: 01/01/2026).',
  dateTime: 'Data/horário inválido ou já ultrapassado. Use o formato DD/MM/AAAA HH:MM (ex.: 25/10/2026 14:00).',
};

// -------------------------------------------------------------------------
// Extração da mensagem recebida a partir do corpo do webhook da Evolution API
// -------------------------------------------------------------------------
function extractMessageInfo(body) {
  

  if(!body?.data) {
    console.log('conteúdo não processável');
    return;
  }

  const data = body.data;
  const key = data.key;
  const messageId = key.id;
  const senderNumber = key.remoteJidAlt || key?.remoteJid;
  const fromMe = Boolean(key.fromMe);
  const message = data.message || {};

  let text = message.conversation;

  return { senderNumber, fromMe, text, messageId };
}

/**
 * Move a sessão para `pageName`, envia a mensagem correspondente e, se a
 * página for do tipo "auto" (exceto "Encerramento"), encadeia automaticamente
 * para a próxima página, sem esperar nova mensagem do usuário.
 */
async function advanceToPage(senderNumber, pageName) {
  const page = getPage(pageName);
  if (!page) {
    console.error(`[webhookHandler] Página "${pageName}" não encontrada no fluxo.`);
    return;
  }

  setPage(senderNumber, page.displayName);
  await evolutionApi.sendText(senderNumber, page.text, page.options);

  //se a página for 'auto' já passa para o próximo estágio.
  const isAutoAdvance = page.inputType === 'auto' && page.displayName !== 'Encerramento';
  if (isAutoAdvance && page.nextPage) {
    await advanceToPage(senderNumber, page.nextPage);
  }
}

// -------------------------------------------------------------------------
// State Machine principal
// -------------------------------------------------------------------------
/*
Tipos de mensagem para resposta
text_menu: menu númerico
text: texto, mensagem comum
*/
async function handleUserInput(senderNumber, text) {
  const session = getSession(senderNumber);
  const currentPage = getPage(session.currentPage) || getPage(START_PAGE);
  const value = (text).trim();
  console.log('started to handle');

  // Caso já estivesse em estado resetado reinicia o chat
  if (currentPage.displayName === 'Encerramento') {
    resetSession(senderNumber);
    return advanceToPage(senderNumber, START_PAGE);
  }

  if (currentPage.inputType == 'text_menu') {
    const isNumeric = /^\d+$/.test(value);
    const option = isNumeric ? currentPage.options[Number(value) - 1] : null;

    if (!option) {
      await evolutionApi.sendText(
        senderNumber,
        'Não entendi sua escolha. Responda apenas com o número de uma das opções apresentadas.'
      );
      await evolutionApi.sleep(1000);//1 segundo para não flodar
      await evolutionApi.sendText(senderNumber, currentPage.text, currentPage.options);
      return;
    }

    const nextPageName = currentPage.transitions?.[option.id] || currentPage.nextPage;

    if (!nextPageName) {
      console.error(
        `[webhookHandler] Nenhuma transição configurada para a opção "${option.id}" ` +
          `da página "${currentPage.displayName}".`
      );
      return;
    }

    return advanceToPage(senderNumber, nextPageName);
  }

  if (currentPage.inputType == 'text') {

    if (!value) {
      await evolutionApi.sendText(senderNumber, 'Não entendi. Pode digitar novamente?');
      await evolutionApi.sendText(senderNumber, currentPage.text, currentPage.options);
      return;
    }

    if (currentPage.validate && !validators[currentPage.validate](value)) {
      await evolutionApi.sendText(senderNumber, validationMessages[currentPage.validate]);
      await evolutionApi.sendText(senderNumber, currentPage.text, currentPage.options);
      return;
    }
    if (currentPage.saveAs) {
      setData(senderNumber, currentPage.saveAs, value);
    }
    
    return advanceToPage(senderNumber, currentPage.nextPage);
  }
}

/**
 * CHECA SE A MENSAGEM É VÁLIDA
 * senderNumber chega com o formato: cod_area ddd 99999999 @ identificador
 * text é o texto da mensagem
 */
function isMessageValid(senderNumber, fromMe, text) {
  const ALLOWED_NUMBER = String(process.env.ALLOWED_NUMBER)

  if (senderNumber?.includes('@g')) { // ignora eventos de grupo
    console.log(' ignorado por ser um grupo');
    return;
  }

  if (!text /*|| fromMe*/) {// ignora mensagens sem conteúdo processável ou minhas
    console.log('/n/n ignorado por conteudo n processável');
    return; 
  }

  return senderNumber.split('@')[0] == ALLOWED_NUMBER;
}

// -------------------------------------------------------------------------
// Ponto de entrada chamado pela rota /webhook
// -------------------------------------------------------------------------
async function processWebhookEvent(body) {
  
  const extractedBody = extractMessageInfo(body);
  
  if(!extractedBody) return;

  const { senderNumber, fromMe, text, messageId } = extractedBody;

  if (!isMessageValid(senderNumber, fromMe, text)) return;

  await handleUserInput(senderNumber, text);
}

module.exports = {
  processWebhookEvent,
  handleUserInput,
  extractMessageInfo,
  advanceToPage,
};
