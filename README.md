# Betelgeuse

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Versão](https://img.shields.io/badge/versão-0.2.0-orange)](ROADMAP.md)
[![Licença: MIT](https://img.shields.io/badge/licença-MIT-green)](LICENSE)

Extensão de código aberto para Google Chrome (Manifest V3) que bloqueia
anúncios no **xvideos.com**: pre-roll em vídeo, overlays sobre o player,
banners, iframes patrocinados e popups/popunders.

> ⚠️ **Aviso de conteúdo:** este projeto tem como alvo um site com conteúdo
> adulto. O repositório contém apenas código-fonte (nenhum conteúdo adulto),
> mas instalar e testar a extensão exige ser maior de idade (18+).
> Projeto sem qualquer afiliação com o site-alvo.

## Recursos

- 🎬 **Pre-roll neutralizado** — clica automaticamente em "skip/pular" e esconde
  overlays de anúncio sobre o player.
- 🧹 **Filtro cosmético site-wide** — remove banners, slots patrocinados e
  iframes de anúncios na home, busca, categorias e páginas de vídeo,
  incluindo conteúdo injetado dinamicamente (via `MutationObserver`).
- 🌐 **Bloqueio de rede (DNR)** — ruleset estático `declarativeNetRequest`
  que barra requisições a endpoints de anúncios (VAST/VMAP e ad-servers
  conhecidos), restrito a requisições iniciadas pelo próprio site.
- 🪟 **Contenção de popups** — guarda contra `window.open` abusivo disparado
  por cliques em anúncios, sem quebrar navegação legítima.
- 🎛️ **Popup com toggle** — liga/desliga com um clique + contadores
  (itens ocultados, pre-rolls pulados, popups barrados) da aba atual.
- 🕵️ **Sem rastros no histórico** — apaga automaticamente as visitas ao
  xvideos.com do histórico do navegador (e limpa entradas antigas ao
  instalar/iniciar). Respeita o toggle liga/desliga.
- 🔒 **Escopo mínimo** — atua somente em `*.xvideos.com`, sem telemetria e
  sem coleta de dados.

## Instalação (modo desenvolvedor)

1. Baixe ou clone este repositório:
   ```sh
   git clone https://github.com/Ald3b4r4n/Betelgeuse.git
   ```
2. Abra `chrome://extensions` no Chrome.
3. Ative o **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e selecione a pasta do projeto
   (a que contém o `manifest.json`).
5. Acesse o xvideos.com — o ícone da extensão mostra o popup com o
   status e as estatísticas.

Para atualizar após `git pull`, clique em **Recarregar** na extensão em
`chrome://extensions`.

## Como funciona

Duas camadas complementares, seguindo a plataforma Manifest V3:

| Camada | Arquivo(s) | O quê |
|---|---|---|
| Bloqueio de rede | `rules/ads.json` | Regras estáticas `declarativeNetRequest` (`block`) com `initiatorDomains: ["xvideos.com"]`. Padrão "permitir tudo, bloquear só o listado" — sem risco de página em branco. |
| Filtro cosmético + player | `src/content.js` | Content script (mundo isolado): CSS cosmético, varredura do DOM, `MutationObserver`, auto-skip de pre-roll e contadores. |
| Contenção de popups | `src/page.js` | Page script (mundo MAIN, injetado via `<script>`): envolve `window.open` com heurística conservadora. Necessário porque o mundo isolado não intercepta o `window.open` da página. |
| Interface | `src/popup.html`, `src/popup.js` | Toggle liga/desliga (persistido em `chrome.storage`) + estatísticas via mensagens. |

Detalhes do ruleset em [`rules/README.md`](rules/README.md).

## Estrutura do projeto

```
├── manifest.json        # Manifest V3: permissões, DNR, content scripts
├── rules/
│   ├── ads.json         # Ruleset estático (block; só o listado)
│   └── README.md        # Notas sobre cada grupo de regras
├── src/
│   ├── content.js       # Filtro cosmético + auto-skip (mundo isolado)
│   ├── page.js          # Guarda de window.open (mundo MAIN)
│   ├── popup.html       # Interface do popup
│   └── popup.js         # Lógica do popup
├── scripts/
│   └── validate.mjs     # Validação estática (JSONs, schema, arquivos)
├── icons/               # Ícones 16/32/48/128
├── ROADMAP.md           # Roteiro de desenvolvimento
└── LICENSE              # MIT
```

## Desenvolvimento

Pré-requisito: Node.js (apenas para a validação estática).

```sh
node scripts/validate.mjs   # valida manifest, regras DNR e arquivos
```

### Adicionando uma regra de rede

1. Na aba **Network** do DevTools, identifique o domínio/caminho do ad-server.
2. Adicione um bloco em `rules/ads.json` com o próximo `id` livre
   (ver convenção em [`rules/README.md`](rules/README.md)).
3. Rode `node scripts/validate.mjs` e recarregue a extensão.

### Depurando regras no navegador

1. Adicione temporariamente a permissão `declarativeNetRequestFeedback`
   ao `manifest.json` (apenas em desenvolvimento, nunca no release).
2. Use `chrome.declarativeNetRequest.getMatchedRules()` no console de uma
   página de extensão para confirmar o que foi bloqueado.

### Refinando seletores cosméticos

Os seletores atuais são um conjunto inicial heurístico. O refinamento com o
DOM real do site é a **Fase 0** do [ROADMAP](ROADMAP.md), que traz o passo a
passo de inspeção com DevTools.

## Permissões e privacidade

| Permissão | Por quê |
|---|---|
| `declarativeNetRequest` | Bloquear requisições de anúncios (sem ler conteúdo). |
| `storage` | Persistir o toggle liga/desliga localmente. |
| `history` | Apagar visitas ao xvideos.com do histórico (somente esse domínio). |
| Host `*.xvideos.com` | Único site onde a extensão atua. |

A extensão **não coleta, transmite ou armazena** nenhum dado do usuário.
Todo o processamento acontece localmente no navegador.

## Roadmap

Ver [ROADMAP.md](ROADMAP.md) — inclui a Fase 0 (mapeamento real do site),
o plano até a v1.0.0 e o checklist de publicação na Chrome Web Store.

## Contribuindo

1. Abra uma issue descrevendo o anúncio não bloqueado (tipo de página,
   print do elemento e, se possível, o seletor/URL observado no DevTools).
2. Pull requests são bem-vindos: mantenha o escopo mínimo, rode
   `node scripts/validate.mjs` e atualize o README/ROADMAP quando aplicável.

## Licença

[MIT](LICENSE) — © 2026 Ald3b4r4n.
