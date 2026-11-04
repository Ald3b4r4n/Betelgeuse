/* Betelgeuse — filtro puro de histórico.
 *
 * Sem dependência de APIs do Chrome para poder ser testado no Node.
 * A decisão final (shouldBlock) combina:
 *  - hosts adultos/contos/redirecionadores conhecidos;
 *  - menções a "xvideos" em URL, título ou query;
 *  - famílias de termos sensíveis (pornô, pornografia, sexo, sexual, erótico,
 *    inglês/gírias e termos adultos em português);
 *  - títulos típicos de spam de notificação ("Click Allow").
 */

import { SITES, HISTORY_ONLY_HOSTS, REDIRECT_HOSTS } from './sites.js';

// Parâmetros de busca usados pelos buscadores mais comuns e por sites adultos.
const SEARCH_PARAMS = Object.freeze([
  'q',
  'query',
  'text',
  'search',
  'p',
  'keyword',
  'keywords',
  'k',
  'wd',
  's',
  'term',
  'search_query'
]);

const BLOCKED_HOSTS = Object.freeze([
  ...SITES,
  ...HISTORY_ONLY_HOSTS,
  ...REDIRECT_HOSTS
]);

// Termos normalizados (sem acento, minúsculos). O `\b` evita falsos positivos
// como "sexta-feira", "Essex" e "sexismo"; os prefixos sem `\b` final pegam
// slugs colados ("pornografia", "contoseroticos", "xxxvideos").
const SENSITIVE_PATTERNS = [
  'porn',
  '\\bsex[ou]',
  '\\bsex\\b',
  '\\bsexting\\b',
  '\\bsexy\\b',
  '\\bsexcam\\w*',
  '\\bsexshop\\w*',
  '\\bsexvideo\\w*',
  '(?:^|[^a-z])erotic',
  '\\berotism',
  '\\berotiz',
  'contoserotic',
  '\\bxxx',
  '\\bnsfw',
  '\\bonlyfans',
  '\\bhentai',
  '\\bmilf(?:videos?)?\\b',
  '\\bcamgirl\\w*',
  '\\bnudes?',
  '\\bputarias?',
  '\\borgias?',
  '\\bsurubas?',
  '\\bmasturb\\w*',
  '\\bpunhetas?',
  '\\bxoxotas?',
  '\\bbucetas?',
  '\\btransa\\b',
  '\\btransas\\b',
  '\\btransar\\b'
];

const SENSITIVE_RE = new RegExp(SENSITIVE_PATTERNS.join('|'));

// "xvideos" como palavra (evita falsos positivos como "notxvideos.com",
// mas casa com "xvideos", "xvideos-br", "www.xvideos.com").
const XVIDEOS_RE = /\bxvideos/;

// Títulos típicos de spam de notificação/popup (sem ambiguidade).
const SPAM_TITLE_RE =
  /^click\W*allow\b|^clique\s+(?:em\s+)?\W*permitir\b|^wait a moment, loading/;

// Normaliza para comparação: minúsculas, decodifica %XX e `+`,
// remove acentos. Assim "Pornô" == "porno" e "Eróticos" == "eroticos".
export function normalize(str) {
  let s = String(str || '').replace(/\+/g, ' ');
  try {
    s = decodeURIComponent(s);
  } catch {
    // Texto com `%` solto: mantém como está e segue para minúsculas.
  }
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function hostMatches(host, suffix) {
  return host === suffix || host.endsWith(`.${suffix}`);
}

function isBlockedHost(host) {
  return BLOCKED_HOSTS.some((h) => hostMatches(host, h));
}

// Junta os parâmetros de busca da URL (já decodificados) em um texto só.
function getSearchText(urlObj) {
  const parts = [];
  try {
    for (const key of SEARCH_PARAMS) {
      const vals = urlObj.searchParams.getAll(key);
      for (const v of vals) {
        if (v) parts.push(v);
      }
    }
  } catch {
    // URL sem query legível: segue sem texto de busca.
  }
  return parts.join(' ');
}

// Decisão central: esta visita deve sumir do histórico?
export function shouldBlock(url, title) {
  if (!url) return false;
  let urlObj;
  try {
    urlObj = new URL(url);
  } catch {
    return false;
  }

  const host = urlObj.hostname.toLowerCase();
  if (isBlockedHost(host)) return true;

  const normUrl = normalize(urlObj.href);
  const normTitle = normalize(title || '');
  const normQuery = normalize(getSearchText(urlObj));

  if (
    XVIDEOS_RE.test(normUrl) ||
    XVIDEOS_RE.test(normTitle) ||
    XVIDEOS_RE.test(normQuery)
  ) {
    return true;
  }
  if (SPAM_TITLE_RE.test(normTitle)) return true;

  return (
    SENSITIVE_RE.test(normUrl) ||
    SENSITIVE_RE.test(normTitle) ||
    SENSITIVE_RE.test(normQuery)
  );
}
