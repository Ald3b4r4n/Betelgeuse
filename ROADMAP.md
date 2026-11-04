# Roadmap — Betelgeuse

> Status atual: **v0.4.0** — histórico ampliado e bloqueio de anúncios em uma
> lista de tubos/câmeras adultos.
> Os seletores e regras atuais são um ponto de partida heurístico; o
> refinamento com o DOM/tráfego real de cada site é a Fase 0 abaixo.

## v0.2.0 — Sem rastros no histórico (entregue)

- [x] Service worker (`src/background.js`) apaga visitas ao xvideos.com via
      `chrome.history.onVisited` + `deleteUrl` (respeita o toggle).
- [x] Limpeza de entradas pré-existentes em `onInstalled`/`onStartup`.
- [x] Permissão `history` documentada no README (gera aviso ao instalar).

## v0.3.0 — Histórico ampliado (entregue)

- [x] `src/background.js`: `shouldBlock(url, title)` com normalização
      (minúsculas, sem acento) cobrindo xvideos.com, menções a "xvideos"
      em qualquer buscador (`q/query/text/search/p`, URL ou título) e
      "conto(s) erótico(s)" + variações na URL, título ou query.
- [x] `purgeExisting()` busca os 6 termos e filtra com a mesma regra.

## v0.3.1 — Correção: entradas que escapavam (entregue)

- [x] **Causa raiz:** `onVisited` dispara antes do título existir, então a
      decisão por título falhava e a entrada ficava no histórico (URLs sem
      palavra-chave, como `contoseroticos.com`).
- [x] Rechecagem pontual (3 s e 10 s) relendo o título já gravado.
- [x] Varredura periódica (`chrome.alarms`, 1 min) dos últimos 15 min como
      rede de segurança (cobre service worker encerrado).
- [x] `onInstalled`/`onStartup` passam a varrer o histórico inteiro
      (`text: ''`) em vez de buscar 6 termos — pega títulos que não contêm a
      palavra-chave pesquisada.
- [x] Regex de "conto(s) erótico(s)" passa a casar a forma colada
      (`contoseroticos`), comum em domínios/slugs.
- [x] Lista explícita de domínios (`BLOCKED_HOSTS`) e de intermediários de
      popup/redirecionamento (`BLOCKED_REDIRECT_HOSTS`), incluindo títulos
      típicos de spam de notificação ("Click Allow").
- [x] `xvideos` passa a exigir limite de palavra (não casa `notxvideos.com`).
- [x] Nova permissão `alarms` (sem aviso ao usuário) documentada no README.

## v0.4.0 — Tubos adultos + histórico ampliado (entregue)

- [x] **Lista compartilhada** (`src/sites.js`): 25 sites de vídeo/câmera,
      hosts só de histórico (contos, assinaturas, câmeras) e redirecionadores.
- [x] **Histórico** (`src/history-filter.js` + `src/background.js`):
      - famílias `pornô/pornografia`, `sexo/sexual`, `erótico/erotismo`,
        inglês/gírias (`xxx`, `nsfw`, `onlyfans`, `hentai`, `milf`, `sexting`,
        `sexcam`, `sexshop`, `sexvideo`, `nudes`) e termos adultos em
        português;
      - normalização de acentos e URL encoding;
      - busca em URL, título e query (`q`, `query`, `search_query` etc.);
      - varredura completa paginada em blocos de 1.000 itens, do mais
        recente para o mais antigo (sem o limite de um único `search`);
      - `storage.onChanged`: ao religar o toggle, dispara nova limpeza;
      - hosts adultos apagados mesmo sem palavra-chave no título.
- [x] **Rede** (`rules/ads.json` gerado por `scripts/build-rules.mjs`):
      regras `block` por domínio de ad-server com `initiatorDomains` restrito
      aos sites; VAST/VMAP sem `media` para não derrubar vídeo legítimo.
- [x] **Cosmético/player** (`src/content.js`): seletores adicionais, iframes
      de redes conhecidas, auto-skip com guarda para "skip to content".
- [x] **Popups** (`src/page.js`): guard no mundo MAIN como content script,
      ativado pela flag `data-betelgeuse-enabled` do toggle.
- [x] **Manifest**: versão 0.4.0, Chrome 111+, `background.type = module`,
      hosts/content scripts para todos os sites, remoção da injeção via
      `<script>` e de `web_accessible_resources`.
- [x] **Testes/validação**: `scripts/test-history.mjs` (44 verificações) e
      `scripts/validate.mjs` conferindo manifest, sites e regras DNR.

## Fase 0 — Mapeamento real dos sites (pré-requisito das próximas versões)

Objetivo: trocar heurísticas por dados observados. Requer navegador com a
extensão instalada e acesso aos sites-alvo (conteúdo adulto, 18+).

- [ ] **0.1 — Mapear o player.** Para cada site prioritário, abrir 3–5 páginas
      de vídeo e anotar no DevTools (aba Elements): container do player,
      elemento do pre-roll (iframe separado? `<video>` alternativo? overlay?),
      botão de skip (seletor + delay até habilitar), overlays que interceptam
      o clique.
- [ ] **0.2 — Mapear o tráfego de ads.** Na aba Network (filtro por domínio),
      listar domínios/caminhos de ad-servers e endpoints VAST/VMAP durante
      navegação + reprodução. Anotar quais regras atuais acertam e quais
      faltam.
- [ ] **0.3 — Mapear o funcional (intocáveis).** Listar hosts de vídeo/CDN,
      thumbnails, estáticos e endpoints de busca/navegação. Estes viram
      regras `allow` de proteção.
- [ ] **0.4 — Mapear páginas não-vídeo.** Repetir 0.1–0.3 (versão resumida)
      na home, busca e categorias: slots de banner, nativos e popups.
- [ ] **0.5 — Decisão pre-roll.** Se o anúncio vier do mesmo domínio/CDN do
      vídeo (indistinguível por URL), registrar a decisão: bloqueio por rede
      NÃO se aplica ao pre-roll → solução é skip via DOM (já implementado
      em `src/content.js`, a refinar com os seletores reais).

Entregável: atualizar `scripts/build-rules.mjs`, `AD_SELECTORS` em
`src/content.js` e a tabela de intocáveis neste arquivo/issue.

## v0.5.0 — Refinamento com dados reais

- [ ] Regras DNR com domínios exatos observados na Fase 0, por site.
- [ ] Regras `allow` de proteção para vídeo/CDN/funcionais.
- [ ] Seletores cosméticos reais (por tipo de página) + remoção dos
      heurísticos que não acertarem nada.
- [ ] Lógica de skip ajustada ao player real (seletor do botão, timing).
- [ ] Regressão manual: home, busca, categoria, 5 vídeos por site, toggle
      on/off.

## v0.6.0 — Robustez

- [ ] Throttle/debounce revisado (impacto em CPU em páginas longas).
- [ ] Tratamento de anti-adblock, se algum site detectar a extensão
      (estratégia preferida: "skip rápido" em vez de bloqueio total).
- [ ] Popup: exibir estado por aba + link para troubleshooting.
- [ ] `README`: seção de problemas conhecidos com sintomas e workarounds.

## v1.0.0 — Publicação na Chrome Web Store

- [ ] Revisar conformidade com as políticas vigentes da loja no momento
      da submissão (propósito único, permissões mínimas, privacidade).
- [ ] Remover `declarativeNetRequestFeedback` se adicionado em dev.
- [ ] Ícones finais + screenshots da loja (sem conteúdo adulto visível —
      usar placeholders/mocks).
- [ ] Descrição curta/longa + declaração de privacidade (nenhum dado coletado).
- [ ] Empacotar `.zip` de release e subir; registrar versão e data aqui.

## Backlog / ideias futuras

- Allowlist por sessão ("pausar neste site/vídeo") com auto-retomada.
- Dois toggles independentes: "Limpar histórico" e "Bloquear anúncios".
- Ocultar resultados de busca com os termos na própria página do Google/Bing
  (content script em buscadores) — diferente de limpar o histórico.
- Suporte a sites adultos fora da lista via permissão opcional + detecção
  em runtime (evita `<all_urls>` por padrão).
- Estatísticas agregadas (total bloqueado, por dia) — sempre locais.
- Exportar/importar regras customizadas do usuário (regras dinâmicas DNR).
- Suporte a outros navegadores Chromium (Edge, Brave, Opera).
- Testes automatizados com DOM simulado (happy-dom/jsdom) para o filtro
  cosmético e o auto-skip.

## Convenção de versão

SemVer: `MINOR` para novas capacidades de bloqueio, `PATCH` para ajustes
de seletores/regras. Mudanças de seletores/regras motivadas por mudanças
dos sites-alvo entram como `PATCH` com nota no changelog da release.
