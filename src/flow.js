/**
 * flow.js
 * -----------------------------------------------------------------------
 * Define a máquina de estados do chatbot "Ambulatório HU" a partir da
 * estrutura de páginas fornecida na especificação do projeto.
 *
 * Cada "page" pode ter:
 *  - inputType: "text_menu" | "text" | "auto"
 *  - text: mensagem principal exibida ao usuário
 *  - options: array de { id, title }                (quando inputType = text_menu)
 *  - nextPage: próxima página (fluxo linear, sem decisão)
 *  - transitions: mapa { idEscolhido: proximaPagina } (fluxo com decisão)
 * -----------------------------------------------------------------------
 */

const pages = [
  {
    displayName: 'Start',
    inputType: 'text_menu',
    text:
      "Olá, antes de começarmos gostaria que escolhesse o idioma em que você prefere ser atendido.\n",
    options: [
      { id: 'idioma_pt', title: 'Português Brasileiro' },
      { id: 'idioma_guarani', title: 'Guarani' },
    ],
    transitions: {
      idioma_pt: 'Selecionar Setor',
      idioma_guarani: 'Selecionar Setor',
    },
  },
  {
    displayName: 'Selecionar Setor',
    inputType: 'text_menu',
    text: 'Sobre qual setor gostaria de ajuda?',
    options: [
      { id: 'setor_ambulatorio', title: 'Ambulatório' },
      { id: 'setor_outros', title: 'Outros Setores' },
    ],
    transitions: {
      setor_ambulatorio: 'Termos de Serviço',
      setor_outros: 'Termos de Serviço',
    },
  },
  {
    displayName: 'Termos de Serviço',
    inputType: 'text_menu',
    text:
      'Olá! Sou o assistente digital do HU.\n' +
      'Para iniciarmos o atendimento no Ambulatório, você aceita nossos Termos de Serviço e Privacidade?\n' +
      'Lembramos que não é permitido o envio de documentos e imagens neste canal.',
    options: [
      { id: 'termos_sim', title: 'Sim' },
      { id: 'termos_nao', title: 'Não' },
    ],
    transitions: {
      termos_sim: 'Solicitar CPF',
      termos_nao: 'Encerramento',
    },
  },
  {
    displayName: 'Solicitar CPF',
    inputType: 'text',
    text: 'Por favor, digite seu CPF, apenas números, sem pontos ou traços (ex.: 01234567899).',
    saveAs: 'cpf',
    validate: 'cpf',
    nextPage: 'Menu Principal',
  },
  {
    displayName: 'Menu Principal',
    inputType: 'text_menu',
    text: 'O que deseja fazer no ambulatório hoje?',
    options: [
      { id: 'menu_remarcar', title: 'Remarcar' },
      { id: 'menu_cancelar', title: 'Cancelar' },
      { id: 'menu_consultas', title: 'Ver Consultas' },
    ],
    transitions: {
      menu_remarcar: 'Selecionar Especialidade Remarcar',
      menu_cancelar: 'Informar Consulta Cancelar',
      menu_consultas: 'Exibir Consultas',
    },
  },
  {
    displayName: 'Selecionar Especialidade Remarcar',
    inputType: 'text',
    text: 'Qual especialidade deseja remarcar? Digite o nome (ex.: Cardiologia).',
    saveAs: 'especialidade',
    nextPage: 'Selecionar Medico Remarcar',
  },
  {
    displayName: 'Selecionar Medico Remarcar',
    inputType: 'text',
    text: 'Com qual médico deseja remarcar? Digite o nome do profissional (ex.: João Carlos Santos da Silva).',
    saveAs: 'medico',
    nextPage: 'Informar Data Remarcacao',
  },
  {
    displayName: 'Informar Data Remarcacao',
    inputType: 'text',
    text: 'Qual a sua data de preferência para a remarcação? (ex.: 01/01/2026)',
    saveAs: 'dataRemarcacao',
    validate: 'data',
    nextPage: 'Sucesso Remarcacao',
  },
  {
    displayName: 'Sucesso Remarcacao',
    inputType: 'auto',
    text: 'Seu pedido de remarcação foi registrado! Nossa equipe entrará em contato em breve para confirmar o novo horário.',
    nextPage: 'Encerramento',
  },
  {
    displayName: 'Informar Consulta Cancelar',
    inputType: 'text',
    text: 'Pode me informar a data/horário ou o nome do médico da consulta que deseja cancelar?',
    saveAs: 'consultaCancelar',
    nextPage: 'Sucesso Cancelamento',
  },
  {
    displayName: 'Sucesso Cancelamento',
    inputType: 'auto',
    text: 'Seu pedido de cancelamento foi registrado! Nossa equipe irá confirmar o cancelamento em breve.',
    nextPage: 'Encerramento',
  },
  {
    displayName: 'Exibir Consultas',
    inputType: 'auto',
    text: 'Seu pedido de visualização foi registrado! Nossa equipe irá enviar o relatório em breve.',
    nextPage: 'Encerramento',
  },
  {
    displayName: 'Encerramento',
    inputType: 'auto',
    text: 'Obrigado, seu atendimento foi finalizado. Envie outra mensagem para reiniciar o atendimento.',
    nextPage: 'Start',
  },
];

// Mapa displayName -> page, para lookup O(1)
const pageMap = new Map(pages.map((p) => [p.displayName, p]));

function getPage(displayName) {
  return pageMap.get(displayName);
}

const START_PAGE = 'Start';

module.exports = { pages, pageMap, getPage, START_PAGE };