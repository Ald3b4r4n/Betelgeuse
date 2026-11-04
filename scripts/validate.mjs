// Validação estática da extensão. Uso: `node scripts/validate.mjs`
// Verifica JSONs, schema básico do manifest e das regras DNR, consistência
// entre `src/sites.js` e o manifest, e existência dos arquivos referenciados.
// Saída diferente de zero = falha.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITES } from '../src/sites.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;

function fail(msg) {
  failures += 1;
  console.error(`FAIL: ${msg}`);
}

function ok(msg) {
  console.log(`ok: ${msg}`);
}

function mustExist(rel) {
  if (!existsSync(join(root, rel))) fail(`arquivo ausente: ${rel}`);
  else ok(`existe: ${rel}`);
}

function readJson(rel) {
  try {
    const data = JSON.parse(readFileSync(join(root, rel), 'utf8'));
    ok(`${rel} é JSON válido`);
    return data;
  } catch (e) {
    fail(`${rel} inválido: ${e.message}`);
    return null;
  }
}

function patternFor(site) {
  return `*://*.${site}/*`;
}

// --- manifest.json ---
const manifest = readJson('manifest.json');
if (manifest) {
  if (manifest.manifest_version !== 3) fail('manifest_version deve ser 3');
  else ok('manifest_version = 3');

  for (const key of ['name', 'version', 'description']) {
    if (!manifest[key]) fail(`manifest sem "${key}"`);
  }
  ok('manifest tem name/version/description');

  if (!manifest.description || manifest.description.length > 132) {
    fail('description deve ter no máximo 132 caracteres');
  } else {
    ok('description dentro do limite');
  }

  const minChrome = Number(manifest.minimum_chrome_version || 0);
  if (minChrome < 111) {
    fail('minimum_chrome_version deve ser >= 111 (world: "MAIN")');
  } else {
    ok(`minimum_chrome_version = ${manifest.minimum_chrome_version}`);
  }

  if (!manifest.background || manifest.background.type !== 'module') {
    fail('background.type deve ser "module"');
  } else {
    ok('background.type = module');
  }

  const hostPermissions = manifest.host_permissions || [];
  const contentScripts = manifest.content_scripts || [];
  const contentMatches = contentScripts.flatMap((cs) => cs.matches || []);
  const hosts = [...hostPermissions, ...contentMatches];

  if (!hosts.some((h) => String(h).includes('xvideos.com'))) {
    fail('nenhum host_permission/match cobre xvideos.com');
  } else ok('escopo cobre xvideos.com');

  if (
    hosts.some(
      (h) => String(h).includes('<all_urls>') || String(h) === '*://*/*'
    )
  ) {
    fail('escopo amplo demais (<all_urls> ou *://*/*)');
  } else ok('sem escopo amplo de hosts');

  if (!SITES.length) fail('SITES está vazio em src/sites.js');

  const contentEntry = contentScripts.find((cs) =>
    (cs.js || []).includes('src/content.js')
  );
  if (!contentEntry) fail('content_scripts sem src/content.js');
  else ok('content_scripts inclui src/content.js');

  const pageEntry = contentScripts.find((cs) =>
    (cs.js || []).includes('src/page.js')
  );
  if (!pageEntry) fail('content_scripts sem src/page.js');
  else if (pageEntry.world !== 'MAIN') {
    fail('src/page.js deve rodar no mundo MAIN');
  } else ok('src/page.js roda no mundo MAIN');

  for (const site of SITES) {
    const pattern = patternFor(site);
    if (!hostPermissions.includes(pattern)) {
      fail(`host_permissions sem o padrão de ${site} (${pattern})`);
    }
    if (!(contentEntry?.matches || []).includes(pattern)) {
      fail(`content_scripts (content.js) sem o padrão de ${site} (${pattern})`);
    }
    if (!(pageEntry?.matches || []).includes(pattern)) {
      fail(`content_scripts (page.js) sem o padrão de ${site} (${pattern})`);
    }
  }
  if (SITES.every((s) => hostPermissions.includes(patternFor(s)))) {
    ok(`${SITES.length} sites presentes em host_permissions`);
  }
  if (
    SITES.every(
      (s) =>
        (contentEntry?.matches || []).includes(patternFor(s)) &&
        (pageEntry?.matches || []).includes(patternFor(s))
    )
  ) {
    ok(`${SITES.length} sites presentes nos dois content_scripts`);
  }

  for (const r of (manifest.declarative_net_request || {}).rule_resources || []) {
    if (r.path) mustExist(r.path);
  }
  for (const cs of contentScripts) {
    for (const js of cs.js || []) mustExist(js);
  }
  for (const wr of manifest.web_accessible_resources || []) {
    for (const r of wr.resources || []) mustExist(r);
  }
  if (manifest.background && manifest.background.service_worker) {
    mustExist(manifest.background.service_worker);
  }
  if (manifest.action && manifest.action.default_popup) {
    mustExist(manifest.action.default_popup);
  }
  for (const icon of Object.values(manifest.icons || {})) mustExist(icon);
}

// --- package.json ---
const pkg = readJson('package.json');
if (pkg && pkg.type !== 'module') {
  fail('package.json deve declarar "type": "module"');
} else if (pkg) {
  ok('package.json type = module');
}
if (pkg && manifest && pkg.version !== manifest.version) {
  fail(
    `versão do package.json (${pkg.version}) difere do manifest (${manifest.version})`
  );
} else if (pkg && manifest) {
  ok('versões de package.json e manifest coincidem');
}

// --- rules DNR ---
const rules = readJson('rules/ads.json');
if (rules) {
  if (!Array.isArray(rules)) {
    fail('rules/ads.json deve ser um array de regras');
  } else {
    const ids = new Set();
    for (const [i, rule] of rules.entries()) {
      const where = `regra índice ${i}`;
      if (!Number.isInteger(rule.id) || rule.id <= 0) {
        fail(`${where}: id inválido`);
      } else if (ids.has(rule.id)) {
        fail(`${where}: id duplicado (${rule.id})`);
      } else {
        ids.add(rule.id);
      }

      if (!rule.action || typeof rule.action.type !== 'string') {
        fail(`${where}: action.type ausente`);
      }

      const cond = rule.condition || {};
      if (!cond.urlFilter && !cond.regexFilter) {
        fail(`${where}: condition sem urlFilter/regexFilter`);
      }
      if (!Array.isArray(cond.resourceTypes) || !cond.resourceTypes.length) {
        fail(`${where}: condition.resourceTypes ausente`);
      }
      if ((cond.resourceTypes || []).includes('main_frame')) {
        fail(`${where}: nunca bloquear main_frame`);
      }

      const initiators = cond.initiatorDomains;
      if (!Array.isArray(initiators) || !initiators.length) {
        fail(`${where}: condition.initiatorDomains ausente`);
      } else {
        for (const initiator of initiators) {
          if (!SITES.includes(initiator)) {
            fail(`${where}: initiator fora de SITES (${initiator})`);
          }
        }
        for (const site of SITES) {
          if (!initiators.includes(site)) {
            fail(`${where}: initiatorDomains sem ${site}`);
          }
        }
      }
    }
    if (!rules.length) fail('rules/ads.json está vazio');
    else ok(`${rules.length} regras DNR com ids únicos e schema básico válido`);
  }
}

// --- arquivos de código ---
for (const f of [
  'src/content.js',
  'src/page.js',
  'src/popup.js',
  'src/popup.html',
  'src/background.js',
  'src/sites.js',
  'src/history-filter.js',
  'scripts/build-rules.mjs',
  'scripts/test-history.mjs',
  'package.json'
]) {
  mustExist(f);
}

if (failures > 0) {
  console.error(`\n${failures} falha(s).`);
  process.exit(1);
}
console.log('\nValidação concluída sem falhas.');
