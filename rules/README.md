# Betelgeuse — conjunto inicial (heurístico) de regras de rede
#
# Este arquivo documenta a lógica do ruleset `rules/ads.json`.
# O JSON em si não aceita comentários, então as notas ficam aqui.
#
# Estratégia (v0.1.0):
# - Todas as regras são `block` com `initiatorDomains: ["xvideos.com"]`,
#   ou seja, só valem para requisições iniciadas pelo xvideos.com.
# - Como o padrão é "permitir tudo, bloquear só o listado", não há
#   necessidade de regras `allow` nesta versão.
# - NUNCA bloquear `main_frame` (carregaria a página em branco).
#
# Regras 1-2: formatos de anúncio em vídeo (VAST/VMAP). Costumam ser os
#   endpoints que entregam o pre-roll ao player.
# Regras 3-18: substrings de redes de anúncios/exchanges comuns. São um
#   ponto de partida HEURÍSTICO: a Fase 0 do ROADMAP (inspeção real com
#   DevTools) deve confirmar quais o site usa e adicionar os domínios
#   exatos observados, além de regras `allow` para vídeo/CDN/funcionais.
#
# Como adicionar uma regra após inspecionar o tráfego real:
# 1. Copie o domínio/caminho do ad-server visto na aba Network.
# 2. Adicione um bloco com o próximo `id` livre e `priority: 1`.
# 3. Rode `node scripts/validate.mjs` para validar o JSON e o schema.
