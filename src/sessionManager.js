/**
 * sessionManager.js
 * -----------------------------------------------------------------------
 * Sistema simples de estado de sessão EM MEMÓRIA, mapeando o remoteJid do
 * usuário para a página atual do fluxo e os dados coletados até o momento.
 *
 * ATENÇÃO: como é em memória, os dados são perdidos se o processo Node
 * reiniciar. Para produção, considere trocar este módulo por Redis,
 * SQLite ou outro storage persistente, mantendo a mesma interface pública.
 * -----------------------------------------------------------------------
 */

const { START_PAGE } = require('./flow');

/** @type {Map<string, { currentPage: string, data: Record<string, any>, updatedAt: number }>} */
const sessions = new Map();

function createSession(remoteJid) {
  const session = {
    currentPage: START_PAGE,
    data: {},
    updatedAt: Date.now(),
  };
  sessions.set(remoteJid, session);
  return session;
}

function getSession(remoteJid) {
  return sessions.get(remoteJid) || createSession(remoteJid);
}

function setPage(remoteJid, pageName) {
  const session = getSession(remoteJid);
  session.currentPage = pageName;
  session.updatedAt = Date.now();
  sessions.set(remoteJid, session);
  return session;
}

function setData(remoteJid, key, value) {
  const session = getSession(remoteJid);
  session.data[key] = value;
  session.updatedAt = Date.now();
  sessions.set(remoteJid, session);
  return session;
}

function resetSession(remoteJid) {
  return createSession(remoteJid);
}

function deleteSession(remoteJid) {
  sessions.delete(remoteJid);
}

module.exports = {
  getSession,
  createSession,
  setPage,
  setData,
  resetSession,
  deleteSession,
};
