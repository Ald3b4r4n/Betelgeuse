// Testes do filtro de histórico. Uso: `node scripts/test-history.mjs`
import { normalize, shouldBlock } from '../src/history-filter.js';

const cases = [
  // Termos pedidos
  { name: 'busca pornô', url: 'https://www.google.com/search?q=porn%C3%B4', title: '', expected: true },
  { name: 'busca pornografia', url: 'https://www.google.com/search?q=pornografia', title: '', expected: true },
  { name: 'pornô em título', url: 'https://example.com/v/1', title: 'Pornô caseiro', expected: true },
  { name: 'pornografia em URL', url: 'https://example.com/pornografia', title: '', expected: true },
  { name: 'percent-encoded uppercase', url: 'https://example.com/%50ornografia', title: '', expected: true },
  { name: 'sexo em URL', url: 'https://example.com/sexo', title: '', expected: true },
  { name: 'sexual em título', url: 'https://example.com/v/2', title: 'Educação sexual', expected: true },
  { name: 'busca sexo', url: 'https://www.google.com/search?q=sexo', title: '', expected: true },
  { name: 'erótico', url: 'https://example.com/erotico', title: '', expected: true },
  { name: 'erotismo', url: 'https://example.com/erotismo', title: '', expected: true },
  { name: 'contos eróticos colados', url: 'https://example.com/contoseroticos', title: '', expected: true },
  { name: 'inglês xxx', url: 'https://example.com/xxx', title: '', expected: true },
  { name: 'nsfw', url: 'https://example.com/nsfw', title: '', expected: true },
  { name: 'onlyfans', url: 'https://example.com/onlyfans', title: '', expected: true },
  { name: 'hentai', url: 'https://example.com/hentai', title: '', expected: true },
  { name: 'milf', url: 'https://example.com/milf', title: '', expected: true },
  { name: 'nudes', url: 'https://example.com/nudes', title: '', expected: true },
  { name: 'transar', url: 'https://example.com/transar', title: '', expected: true },
  { name: 'orgia', url: 'https://example.com/orgia', title: '', expected: true },
  { name: 'masturbação', url: 'https://example.com/masturbacao', title: '', expected: true },
  { name: 'xoxota', url: 'https://example.com/xoxota', title: '', expected: true },
  { name: 'buceta', url: 'https://example.com/buceta', title: '', expected: true },

  // Hosts adultos conhecidos
  { name: 'pornhub', url: 'https://www.pornhub.com/view_video.php?viewkey=1', title: '', expected: true },
  { name: 'xhamster', url: 'https://www.xhamster.com/videos/1', title: '', expected: true },
  { name: 'xhamster.desi', url: 'https://www.xhamster.desi/videos/1', title: '', expected: true },
  { name: 'sexvid.xxx', url: 'https://sexvid.xxx/video/1', title: '', expected: true },
  { name: 'onlyfans host', url: 'https://onlyfans.com/creator', title: '', expected: true },
  { name: 'contoseroticos host', url: 'https://contoseroticos.com/conto/1', title: '', expected: true },
  { name: 'wikipédia Sexo (por opção)', url: 'https://pt.wikipedia.org/wiki/Sexo', title: 'Sexo – Wikipédia', expected: true },

  // Falsos positivos que devem ser preservados
  { name: 'sexta-feira', url: 'https://example.com/sexta-feira', title: '', expected: false },
  { name: 'Essex', url: 'https://www.essex.gov.uk/', title: 'Essex County Council', expected: false },
  { name: 'sexismo', url: 'https://example.com/sexismo', title: '', expected: false },
  { name: 'analysis', url: 'https://example.com/analysis', title: '', expected: false },
  { name: 'canal', url: 'https://example.com/canal', title: '', expected: false },
  { name: 'transação', url: 'https://example.com/transacao', title: '', expected: false },
  { name: 'denuded', url: 'https://example.com/denuded', title: '', expected: false },
  { name: 'heterotic', url: 'https://example.com/heterotic', title: '', expected: false },
  { name: 'Milford', url: 'https://example.com/milford', title: '', expected: false },
  { name: 'notxvideos', url: 'https://notxvideos.com/', title: '', expected: false },
  { name: 'busca sexta-feira', url: 'https://www.google.com/search?q=sexta-feira', title: '', expected: false },
  { name: 'busca notxvideos', url: 'https://www.google.com/search?q=notxvideos', title: '', expected: false },

  // Título tardio e spam
  { name: 'título tardio', url: 'https://example.com/v/3', title: 'Sexo ao vivo', expected: true },
  { name: 'click allow', url: 'https://example.com/redirect', title: 'Click Allow', expected: true }
];

let failures = 0;

const normalized = normalize('Pornô');
if (normalized !== 'porno') {
  failures += 1;
  console.error(`FAIL: normalize("Pornô") = "${normalized}" (esperado "porno")`);
} else {
  console.log('ok: normalize remove acento');
}

for (const c of cases) {
  const actual = shouldBlock(c.url, c.title);
  if (actual !== c.expected) {
    failures += 1;
    console.error(
      `FAIL: ${c.name} -> ${actual} (esperado ${c.expected}) [${c.url} | ${c.title}]`
    );
  } else {
    console.log(`ok: ${c.name}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} falha(s).`);
  process.exit(1);
}
console.log(`\n${cases.length + 1} verificações concluídas sem falhas.`);
