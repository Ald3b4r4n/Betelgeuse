# Betelgeuse

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Versão](https://img.shields.io/badge/versão-0.4.0-orange)](ROADMAP.md)
[![Licença: MIT](https://img.shields.io/badge/licença-MIT-green)](LICENSE)

Extensão de código aberto para Google Chrome (Manifest V3) que bloqueia
anúncios e limpa o histórico em uma lista de **sites adultos** (tubos e
câmeras): pre-roll em vídeo, overlays sobre o player, banners, iframes
patrocinados e popups/popunders.

> ⚠️ **Aviso de conteúdo:** este projeto tem como alvo sites com conteúdo
> adulto. O repositório contém apenas código-fonte (nenhum conteúdo adulto),
> mas instalar e testar a extensão exige ser maior de idade (18+).
> Projeto sem qualquer afiliação com os sites-alvo.

## Recursos

- 🎬 **Pre-roll neutralizado** — clica automaticamente em "skip/pular" e esconde
  overlays de anúncio sobre o player.
- 🧹 **Filtro cosmético site-wide** — remove banners, slots patrocinados e
  iframes de anúncios na home, busca, categorias e páginas de vídeo,
  incluindo conteúdo injetado dinamicamente (via `MutationObserver`).
- 🌐 **Bloqueio de rede (DNR)** — ruleset estático `declarativeNetRequest`
  com regras por domínio de ad-server (VAST/VMAP, TrafficJunky, ExoClick,
  JuicyAds, PopAds etc.), restrito a requisições iniciadas pelos sites
  listados.
- 🪟 **Contenção de popups** — guard de `window.open` no mundo MAIN, ativo
  apenas com o toggle ligado, sem quebrar navegação legítima.
- 🕵️ **Histórico ampliado** — apaga automaticamente do histórico do Chrome:
  - visitas a todos os sites da lista (host exato ou subdomínio);
  - buscas/visitas com **pornô, pornografia, sexo, sexual, erótico** e
    variações;
  - termos em inglês/gírias (`xxx`, `nsfw`, `onlyfans`, `hentai`, `milf`,
    `sexting`, `sexcam`, `sexshop`, `sexvideo`, `nudes` etc.);
  - termos adultos em português (`putaria`, `orgia`, `suruba`, `masturbação`,
    `punheta`, `xoxota`, `buceta`, `transar` etc.);
  - hosts de contos/assinaturas/câmeras (`contoseroticos.com`, `onlyfans.com`,
    `literotica.com`, `brazzers.com`, `cameraprive.com` etc.);
  - pesquisas com menção a "xvideos" e títulos típicos de spam ("Click Allow").
  Cobre também páginas cujo título só é conhecido depois do carregamento
  (rechecagem + varredura periódica) e limpa entradas antigas ao
  instalar/iniciar/religar o toggle.
- 🎛️ **Popup com toggle** — liga/desliga com um clique + contadores
  (itens ocultados, pre-rolls pulados, popups barrados) da aba atual.
- 🔒 **Escopo restrito** — atua somente nos sites listados em `src/sites.js`,
  sem telemetria e sem coleta de dados.

## Instalação (modo desenvolvedor)

Requer **Chrome 111+** (usado por `world: "MAIN"` e `initiatorDomains`).

1. Baixe ou clone este repositório:
   ```sh
   git clone https://github.com/Ald3b4r4n/Betelgeuse.git
   ```
2. Abra `chrome://extensions` no Chrome.
3. Ative o **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e selecione a pasta do projeto
   (a que contém o `manifest.json`).
5. Acesse um dos sites suportados — o ícone da extensão mostra o popup com
   o status e as estatísticas.

Para atualizar após `git pull`, clique em **Recarregar** na extensão em
`chrome://extensions`.

## Como funciona

| Camada | Arquivo(s) | O quê |
|---|---|---|
| Configuração de sites | `src/sites.js` | Fonte única de `SITES` (adblock + histórico), `HISTORY_ONLY_HOSTS` e `REDIRECT_HOSTS`. |
| Bloqueio de rede | `rules/ads.json` (gerado por `scripts/build-rules.mjs`) | Regras estáticas `declarativeNetRequest` (`block`) com `initiatorDomains` restrito aos sites. Padrão "permitir tudo, bloquear só o listado" — sem risco de página em branco. |
| Filtro cosmético + player | `src/content.js` | Content script (mundo isolado): CSS cosmético, varredura do DOM, `MutationObserver`, auto-skip de pre-roll e contadores. |
| Contenção de popups | `src/page.js` | Content script no mundo MAIN: envolve `window.open` com heurística conservadora; só age com a flag do toggle ligada. |
| Histórico | `src/background.js` + `src/history-filter.js` | Service worker (módulo): decide o que apagar, pagina o histórico inteiro em blocos de 1.000 itens, rechecagem por título tardio e alarme periódico. |
| Interface | `src/popup.html`, `src/popup.js` | Toggle liga/desliga (persistido em `chrome.storage`) + estatísticas via mensagens. |

### Sites com bloqueio de anúncios

```text
xvideos.com, pornhub.com, xhamster.com, xhamster.desi,
xnxx.com, redtube.com, youporn.com, spankbang.com,
beeg.com, txxx.com, hqporner.com, eporner.com,
tube8.com, thumbzilla.com, porn.com, motherless.com,
sexvid.xxx, porn300.com, missav.com, hanime.tv,
chaturbate.com, stripchat.com, cam4.com, bongacams.com,
livejasmin.com
```

Além desses, o histórico também apaga hosts de contos/assinaturas/câmeras
listados em `HISTORY_ONLY_HOSTS` (ex.: `contoseroticos.com`,
`onlyfans.com`, `literotica.com`, `brazzers.com`).

YouTube, Twitch e sites fora desta lista não recebem bloqueio de anúncios
nesta versão; o foco é a lista adulta acima. Para cobrir outro site, siga os
passos de "Adicionando um site".

### Adicionando um site

1. Adicione o domínio em `SITES` ou `HISTORY_ONLY_HOSTS` (`src/sites.js`).
2. Se for um site com player, adicione o padrão `*://*.dominio/*` em
   `host_permissions` e nos dois `content_scripts` do `manifest.json`.
3. Rode:
   ```sh
   node scripts/build-rules.mjs
   node scripts/validate.mjs
   node scripts/test-history.mjs
   ```
4. Recarregue a extensão e teste o player.

## Estrutura do projeto

```
├── manifest.json        # Manifest V3: permissões, DNR, content scripts
├── package.json         # type: module + scripts de validação/teste
├── rules/
│   ├── ads.json         # Ruleset estático gerado (block; só o listado)
│   └── README.md        # Notas sobre as regras de rede
├── src/
│   ├── sites.js         # Lista compartilhada de sites/hosts
│   ├── history-filter.js # normalize() + shouldBlock() (testável no Node)
│   ├── background.js    # Service worker (módulo): limpeza do histórico
│   ├── content.js       # Filtro cosmético + auto-skip (mundo isolado)
│   ├── page.js          # Guard de window.open (mundo MAIN)
│   ├── popup.html       # Interface do popup
│   └── popup.js         # Lógica do popup
├── scripts/
│   ├── build-rules.mjs  # Gera rules/ads.json a partir de sites.js
│   ├── validate.mjs     # Validação estática (JSONs, schema, consistência)
│   └── test-history.mjs # Testes de normalize()/shouldBlock()
├── icons/               # Ícones 16/32/48/128
├── ROADMAP.md           # Roteiro de desenvolvimento
└── LICENSE              # MIT
```

## Desenvolvimento

Pré-requisito: Node.js 18+ (apenas para scripts de build/validação/teste).

```sh
node scripts/build-rules.mjs   # regenera rules/ads.json
node scripts/validate.mjs      # valida manifest, regras e consistência
node scripts/test-history.mjs  # testa o filtro de histórico
```

Ou, se preferir:

```sh
npm run build:rules
npm run validate
npm test
```

### Adicionando uma regra de rede

1. Na aba **Network** do DevTools, identifique o domínio/caminho do ad-server.
2. Adicione o domínio em `AD_DOMAINS` no `scripts/build-rules.mjs`.
3. Rode `node scripts/build-rules.mjs` e `node scripts/validate.mjs`.
4. Recarregue a extensão.

Não edite `rules/ads.json` à mão: ele é gerado.

### Depurando regras no navegador

1. Adicione temporariamente a permissão `declarativeNetRequestFeedback`
   ao `manifest.json` (apenas em desenvolvimento, nunca no release).
2. Use `chrome.declarativeNetRequest.getMatchedRules()` no console de uma
   página de extensão para confirmar o que foi bloqueado.

### Refinando seletores cosméticos

Os seletores atuais são um conjunto heurístico. O refinamento com o DOM real
de cada site é a **Fase 0** do [ROADMAP](ROADMAP.md), que traz o passo a
passo de inspeção com DevTools.

## Permissões e privacidade

| Permissão | Por quê |
|---|---|
| `declarativeNetRequest` | Bloquear requisições de anúncios (sem ler conteúdo). |
| `storage` | Persistir o toggle liga/desliga localmente. |
| `history` | Apagar do histórico local visitas aos sites listados e entradas com os termos sensíveis. |
| `alarms` | Revisar o histórico recente a cada minuto para apagar páginas cujo título só ficou conhecido depois da visita. |
| Hosts `*://*.site/*` | Únicos sites onde a extensão atua (lista em `src/sites.js`). |

A extensão **não coleta, transmite ou armazena** nenhum dado do usuário.
Todo o processamento acontece localmente no navegador.

## Limitações

- O histórico do Chrome guarda **URL e título**, não o texto do snippet de um
  resultado de busca. Não é possível apagar uma visita apenas porque o snippet
  do Google tinha a palavra, se URL/título não tiverem.
- A limpeza é do **histórico local do Chrome**; não apaga cookies, cache,
  downloads nem o histórico da conta Google.
- `chrome.history.deleteUrl()` remove **todas** as visitas daquela URL. A
  limpeza é destrutiva e não tem "desfazer".
- Sites adultos fora da lista não recebem bloqueio até serem adicionados.
- Anúncios costurados no próprio stream (SSAI) e alguns mid-rolls podem
  permanecer; o alvo é anúncio servido por rede, overlay, banner e popup.
- Alguns sites usam CSP/anti-adblock que pode impedir o filtro cosmético;
  nesses casos, o bloqueio de rede e o auto-skip continuam tentando.
- A lista de termos é agressiva de propósito: páginas legítimas como
  Wikipédia "Sexo", notícias e artigos de saúde também podem sumir do
  histórico.
- Se bloquear um domínio de anúncio quebrar a reprodução de algum site, a
  correção é remover a regra ou criar uma exceção `allow` para o CDN de vídeo.

## Roadmap

Ver [ROADMAP.md](ROADMAP.md) — inclui a Fase 0 (mapeamento real dos sites),
o plano até a v1.0.0 e o checklist de publicação na Chrome Web Store.

## Contribuindo

1. Abra uma issue descrevendo o anúncio não bloqueado (site, tipo de página,
   print do elemento e, se possível, o seletor/URL observado no DevTools).
2. Pull requests são bem-vindos: mantenha o escopo restrito, rode
   `node scripts/build-rules.mjs`, `node scripts/validate.mjs` e
   `node scripts/test-history.mjs`, e atualize o README/ROADMAP quando
   aplicável.

## Licença

[MIT](LICENSE) — © 2026 Ald3b4r4n.
