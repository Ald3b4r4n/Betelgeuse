# Roadmap — XV AdBlock

> Status atual: **v0.1.0** — MVP heurístico funcional. Os seletores e regras
> atuais são um ponto de partida genérico; o refinamento com o DOM/tráfego
> real do site é a Fase 0 abaixo.

## Fase 0 — Mapeamento real do site (pré-requisito das próximas versões)

Objetivo: trocar heurísticas por dados observados. Requer navegador com a
extensão instalada e acesso ao site-alvo (conteúdo adulto, 18+).

- [ ] **0.1 — Mapear o player.** Abrir 3–5 páginas de vídeo e anotar no
      DevTools (aba Elements): container do player, elemento do pre-roll
      (iframe separado? `<video>` alternativo? overlay?), botão de skip
      (seletor + delay até habilitar), overlays que interceptam o clique.
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

Entregável: atualizar `rules/ads.json`, `AD_SELECTORS` em `src/content.js`
e a tabela de intocáveis neste arquivo/issue.

## v0.2.0 — Refinamento com dados reais

- [ ] Regras DNR com domínios exatos observados na Fase 0.
- [ ] Regras `allow` de proteção para vídeo/CDN/funcionais.
- [ ] Seletores cosméticos reais (por tipo de página) + remoção dos
      heurísticos que não acertarem nada.
- [ ] Lógica de skip ajustada ao player real (seletor do botão, timing).
- [ ] Regressão manual: home, busca, categoria, 5 vídeos, toggle on/off.

## v0.3.0 — Robustez

- [ ] Throttle/debounce revisado (impacto em CPU em páginas longas).
- [ ] Tratamento de anti-adblock, se o site detectar a extensão
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

- Allowlist por sessão ("pausar neste vídeo") com auto-retomada.
- Estatísticas agregadas (total bloqueado, por dia) — sempre locais.
- Exportar/importar regras customizadas do usuário (regras dinâmicas DNR).
- Suporte a outros navegadores Chromium (Edge, Brave, Opera).
- Testes automatizados com DOM simulado (happy-dom/jsdom) para o filtro
  cosmético e o auto-skip.

## Convenção de versão

SemVer: `MINOR` para novas capacidades de bloqueio, `PATCH` para ajustes
de seletores/regras. Mudanças de seletores/regras motivadas por mudanças
do site-alvo entram como `PATCH` com nota no changelog da release.
