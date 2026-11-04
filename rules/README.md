# Betelgeuse — regras de rede (v0.4.0)

Este arquivo documenta a lógica do ruleset `rules/ads.json`.

O JSON é **gerado** por `scripts/build-rules.mjs` a partir de:

- `SITES` em `src/sites.js` (quem pode iniciar a requisição);
- `AD_DOMAINS` em `scripts/build-rules.mjs` (o que é bloqueado).

Não edite `rules/ads.json` à mão. Depois de qualquer alteração:

```sh
node scripts/build-rules.mjs
node scripts/validate.mjs
```

## Estratégia

- Todas as regras são `block` com `initiatorDomains` igual à lista de sites.
  Ou seja, só valem para requisições iniciadas por um dos tubos/câmeras
  suportados.
- O padrão é "permitir tudo, bloquear só o listado": não há necessidade de
  regras `allow` nesta versão. Isso evita página em branco por excesso de
  bloqueio.
- **NUNCA bloquear `main_frame`.** O `scripts/validate.mjs` falha se isso
  acontecer.
- `initiatorDomains` exige Chrome 101+; o manifest declara mínimo 111 por
  causa também de `world: "MAIN"` no page script.

## Grupos de regras

- **Regras 1–2 — VAST/VMAP:** formatos de anúncio em vídeo. Os endpoints
  costumam ser os que entregam o pre-roll ao player. Essas regras bloqueiam
  `script`, `xmlhttprequest`, `sub_frame`, `image` e `other`, mas **não**
  `media`, para não derrubar um arquivo de vídeo legítimo que contenha
  "vast"/"vmap" no caminho.
- **Regras 3+ — domínios de ad-server:** regras `||dominio^` para redes como
  TrafficJunky, ExoClick/Exosrv/Realsrv, JuicyAds, Adsterra, Clickadu,
  HilltopAds, TrafficStars, TrafficFactory, PopAds, PopCash, PropellerAds,
  DoubleClick, Google Syndication/AdServices, AdNexus, Criteo, Taboola,
  Outbrain, MGID, AdSrvr, Rubicon, PubMatic, OpenX, SmartAdServer, Teads,
  SpotX, SpringServe, Amazon Ads, Media.net, RevContent e ZergNet.
  Aqui `media` é bloqueado porque o arquivo de vídeo do anúncio também deve
  ser barrado.

## Adicionando uma regra

1. Copie o domínio do ad-server visto na aba Network.
2. Adicione em `AD_DOMAINS` no `scripts/build-rules.mjs`.
3. Rode `node scripts/build-rules.mjs` e `node scripts/validate.mjs`.
4. Recarregue a extensão e confirme que o player continua funcionando.

Se o domínio for de primeira parte (mesmo host do site) ou necessário para
o player, não o bloqueie por rede: trate com seletor cosmético/skip.
