// Gera rules/ads.json a partir da lista de sites e dos domínios de anúncio.
// Uso: `node scripts/build-rules.mjs`
//
// Mantenha os domínios abaixo em sincronia com o que foi observado nos tubos.
// A validação (`node scripts/validate.mjs`) confere que todos os SITES estão
// presentes em cada regra e que nenhum main_frame é bloqueado.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITES } from '../src/sites.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const AD_DOMAINS = Object.freeze([
  'trafficjunky.net',
  'trafficjunky.com',
  'exoclick.com',
  'exoclick.net',
  'exosrv.com',
  'realsrv.com',
  'juicyads.com',
  'juicyads.net',
  'adsterra.com',
  'adsterra.net',
  'clickadu.com',
  'hilltopads.net',
  'hilltopads.com',
  'trafficstars.com',
  'trafficfactory.biz',
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'propellerpops.com',
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adnxs.com',
  'criteo.com',
  'taboola.com',
  'outbrain.com',
  'mgid.com',
  'adsrvr.org',
  'rubiconproject.com',
  'pubmatic.com',
  'openx.net',
  'smartadserver.com',
  'teads.tv',
  'spotxchange.com',
  'springserve.com',
  'amazon-adsystem.com',
  'media.net',
  'revcontent.com',
  'zergnet.com'
]);

// VAST/VMAP são formatos de anúncio em vídeo; não bloqueamos `media` nessas
// regras para não derrubar um arquivo de vídeo legítimo que contenha o termo.
const VAST_RESOURCE_TYPES = Object.freeze([
  'script',
  'xmlhttprequest',
  'sub_frame',
  'image',
  'other'
]);

const AD_RESOURCE_TYPES = Object.freeze([
  'script',
  'xmlhttprequest',
  'sub_frame',
  'image',
  'media',
  'other'
]);

const rules = [];
let nextId = 1;

for (const filter of ['vast', 'vmap']) {
  rules.push({
    id: nextId++,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: filter,
      initiatorDomains: [...SITES],
      resourceTypes: [...VAST_RESOURCE_TYPES]
    }
  });
}

for (const domain of AD_DOMAINS) {
  rules.push({
    id: nextId++,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: `||${domain}^`,
      initiatorDomains: [...SITES],
      resourceTypes: [...AD_RESOURCE_TYPES]
    }
  });
}

const target = join(root, 'rules', 'ads.json');
writeFileSync(target, `${JSON.stringify(rules, null, 2)}\n`, 'utf8');
console.log(
  `rules/ads.json: ${rules.length} regras para ${SITES.length} sites.`
);
