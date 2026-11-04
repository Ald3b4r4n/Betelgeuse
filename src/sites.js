/* Betelgeuse — configuração compartilhada de sites.
 *
 * SITES: sites em que a extensão atua (bloqueio de anúncios + histórico).
 * HISTORY_ONLY_HOSTS: domínios cujo histórico também é apagado, mas que não
 *   recebem content script (contos, assinaturas e câmeras sem necessidade de
 *   filtro cosmético).
 * REDIRECT_HOSTS: intermediários de popup/redirecionamento observados.
 *
 * Ao alterar SITES, atualize também os padrões correspondentes em
 * manifest.json e rode:
 *   node scripts/build-rules.mjs
 *   node scripts/validate.mjs
 *   node scripts/test-history.mjs
 */

export const SITES = Object.freeze([
  'xvideos.com',
  'pornhub.com',
  'xhamster.com',
  'xhamster.desi',
  'xnxx.com',
  'redtube.com',
  'youporn.com',
  'spankbang.com',
  'beeg.com',
  'txxx.com',
  'hqporner.com',
  'eporner.com',
  'tube8.com',
  'thumbzilla.com',
  'porn.com',
  'motherless.com',
  'sexvid.xxx',
  'porn300.com',
  'missav.com',
  'hanime.tv',
  'chaturbate.com',
  'stripchat.com',
  'cam4.com',
  'bongacams.com',
  'livejasmin.com'
]);

export const HISTORY_ONLY_HOSTS = Object.freeze([
  'onlyfans.com',
  'fansly.com',
  'manyvids.com',
  'literotica.com',
  'contoseroticos.com',
  'meuscontoseroticos.com',
  'contoseroticoscnn.com',
  'casadoscontos.com.br',
  'cameraprive.com',
  'brazzers.com',
  'realitykings.com',
  'bangbros.com',
  'naughtyamerica.com',
  'mofos.com'
]);

export const REDIRECT_HOSTS = Object.freeze([
  'ethnicexpressions.org',
  'bondeddarkenedswerve.com',
  'betawatchhq.it.com'
]);
