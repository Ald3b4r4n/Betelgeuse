// Validação estática da extensão. Uso: `node scripts/validate.mjs`
// Verifica JSONs, schema básico do manifest e das regras DNR, e existência
// dos arquivos referenciados. Saída diferente de zero = falha.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// --- manifest.json ---
const manifest = readJson('manifest.json');
if (manifest) {
  if (manifest.manifest_version !== 3) fail('manifest_version deve ser 3');
  else ok('manifest_version = 3');

  for (const key of ['name', 'version', 'description']) {
    if (!manifest[key]) fail(`manifest sem "${key}"`);
  }
  ok('manifest tem name/version/description');

  const hosts = [
    ...(manifest.host_permissions || []),
    ...((manifest.content_scripts || []).flatMap((cs) => cs.matches || []))
  ];
  if (!hosts.some((h) => String(h).includes('xvideos.com'))) {
    fail('nenhum host_permission/match cobre xvideos.com');
  } else ok('escopo cobre xvideos.com');
  if (hosts.some((h) => String(h).includes('<all_urls>') || String(h) === '*://*/*')) {
    fail('escopo amplo demais (<all_urls> ou *://*/*)');
  } else ok('sem escopo amplo de hosts');

  for (const r of (manifest.declarative_net_request || {}).rule_resources || []) {
    if (r.path) mustExist(r.path);
  }
  for (const cs of manifest.content_scripts || []) {
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

// --- rules DNR ---
const rules = readJson('rules/ads.json');
if (rules) {
  if (!Array.isArray(rules)) {
    fail('rules/ads.json deve ser um array de regras');
  } else {
    const ids = new Set();
    for (const [i, rule] of rules.entries()) {
      const where = `regra índice ${i}`;
      if (!Number.isInteger(rule.id) || rule.id <= 0) fail(`${where}: id inválido`);
      else if (ids.has(rule.id)) fail(`${where}: id duplicado (${rule.id})`);
      else ids.add(rule.id);
      if (!rule.action || typeof rule.action.type !== 'string') {
        fail(`${where}: action.type ausente`);
      }
      const cond = rule.condition || {};
      if (!cond.urlFilter && !cond.regexFilter) {
        fail(`${where}: condition sem urlFilter/regexFilter`);
      }
      if ((cond.resourceTypes || []).includes('main_frame')) {
        fail(`${where}: nunca bloquear main_frame`);
      }
    }
    ok(`${rules.length} regras DNR com ids únicos e schema básico válido`);
  }
}

// --- arquivos de código ---
for (const f of ['src/content.js', 'src/page.js', 'src/popup.js', 'src/popup.html']) {
  mustExist(f);
}

if (failures > 0) {
  console.error(`\n${failures} falha(s).`);
  process.exit(1);
}
console.log('\nValidação concluída sem falhas.');
