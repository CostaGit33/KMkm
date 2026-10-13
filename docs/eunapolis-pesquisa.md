# Pesquisa verificada — ramo +1KM Eunápolis

## Decisão de produto

Eunápolis entra como uma cidade completa do +1KM, mas com evidências separadas por nível: **local confirmado**, **rota sugerida**, **evento temporal**, **infraestrutura histórica**, **proposta editorial** e **informação insuficiente**. O produto não deve chamar de “Centro Histórico” algo que as fontes abertas não delimitam oficialmente.

## Pontos e experiências prioritários

O primeiro catálogo pode usar a Praça da Bandeira, Praça da Liberdade, Parque Ecológico do Gravatá, Praça do Pequi, Praça do Parque da Renovação, Praça da Colônia, Praça Dona Dinah Borges Moura, Lagoa/Academia da Saúde do Dinah Borges, Mercado Municipal Dona Alzira/Feira do Bueiro, Feira Livre Juca Rosa, Viola de Bolso e o Prado da Rua Paulo de Tarso. As fontes confirmam esses locais ou usos, mas horários, endereços completos, acessibilidade e estado atual devem permanecer como campos pendentes.

A pesquisa encontrou uma **ciclofaixa de aproximadamente 6 km na Estrada da Colônia**, em via de tráfego misto. Os endpoints exatos não foram publicados. Ela deve entrar como infraestrutura confirmada, não como rota recreativa pronta.

O Parque Gravatá tem quase 11 hectares, dois lagos naturais, vegetação nativa e pista de caminhada. É um bom ponto de natureza urbana, mas não há base para classificá-lo como cachoeira, trilha de trekking ou área de banho. A pista do entorno da Lagoa Dinah Borges também foi documentada em requalificação, sem GPX ou quilometragem oficial.

Para eventos, o Circuito Sesc 2026 possui percurso descrito entre Praça da Bandeira, Rua Dr. Gravatá, Avenida Demétrio Couto Guerriere e Estrada da Colônia, com modalidades de 3, 5 e 10 km e caminhada. Deve ser tratado como evento temporal, não circuito cotidiano. A Festa do Pedrão e a corrida de cavalo do Prado são patrimônios culturais imateriais; isso não transforma seus locais em rotas permanentes.


## Rotas candidatas

1. Circuito de caminhada do Parque Gravatá — local confirmado; geometria e operação pendentes.
2. Pista da Lagoa Dinah Borges — proposta condicionada à confirmação da restauração.
3. Estrada da Colônia — ciclofaixa demarcada em cerca de 6 km; endpoints e segurança pendentes.
4. Circuito Sesc 2026 — percurso eventual de corrida.
5. Circuito cultural central — Praça do Pequi, Igreja Matriz, Mercado Dona Alzira, Viola de Bolso e Feira Juca Rosa; proposta editorial sem certificação pedonal.
7. Tracks comunitários do Wikiloc — manter como não validados, com seus metadados originais.

## Dados para suportar novas cidades

Cada cidade precisa de `city_id`, nome, UF, geocódigo IBGE, fonte e versão da geometria, pontos, rotas, jornadas, coleções, fontes, status de evidência, validade temporal, coordenadas e fila de validação. Cada rota deve guardar origem, destino, modal, fonte da geometria, evidência dos endpoints, distância/tempo com data, superfície, tráfego, iluminação, acesso, permissão, acessibilidade e risco sazonal.

A base administrativa recomendada para Eunápolis é o geocódigo IBGE **2910727** e a Malha Municipal Digital 2025 em SIRGAS 2000. Fontes colaborativas como OSM, Mapcarta, Moovit, Buser e Wikiloc devem ser auxiliares, nunca a única prova de acesso, segurança, propriedade, proteção ou funcionamento.

## Fontes principais

- Prefeitura — dados municipais: https://www.eunapolis.ba.gov.br/site/dadosmunicipais
- Prefeitura — Praça da Liberdade: https://www.eunapolis.ba.gov.br/Site/Noticias/noticia-180720251513201633-Prefeitura-requalifica-Pra-a-da-Liberdade-e-espa-o-volta-a-ser-local-de-l
- Prefeitura — praças do Pequi e Parque da Renovação: https://www.eunapolis.ba.gov.br/site/Noticias/noticia-220420260959481633-Prefeitura-de-Eun-polis-investe-na-revitaliza-o-das-Pra-as-do-Pequi-e-Par
- Câmara — Parque Gravatá: https://www.camaraeunapolis.ba.gov.br/site/Noticias/noticia-190320251006002476-Vereador-pede-revitaliza-o-do-Parque-Ecol-gico-do-Gravat-em-Eun-polis
- Prefeitura — Circuito Sesc: https://www.eunapolis.ba.gov.br/site/Noticias/noticia-240920261728201633-Prefeitura-de-Eun-polis-orienta-sobre-percurso-e-interdi-es-para-o-Circui
- Prefeitura — ciclofaixa da Estrada da Colônia: https://www.eunapolis.ba.gov.br/Site/Noticias/noticia-180520261520431633-Parceria-entre-Prefeitura-de-Eun-polis-e-Governo-do-Estado-revitaliza-sin
- Viola de Bolso: https://violadebolso.org.br/about/
- IBGE — Eunápolis: https://www.ibge.gov.br/cidades-e-estados/ba/eunapolis.html
- IBGE — malhas territoriais: https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html

## Pendências antes de operação pública

Confirmar endereços e coordenadas de praças e mercados, sanção final da Cruz da primeira missa, horários, acessibilidade, segurança, estado do piso e conclusão das obras. Solicitar à Prefeitura ou organizadores mapas/GPX do Gravatá, Dinah Borges, Circuito Sesc e ciclofaixa. Não publicar cachoeiras ou trilhas rurais de Eunápolis como fatos sem fonte primária e validação de campo.

## Verificação cartográfica do mapa real · 2026-10-09

A camada cartográfica usa Leaflet com tiles do OpenStreetMap. A geocodificação nominal no Nominatim encontrou correspondência direta para três pontos de Eunápolis:

| ID | Ponto | Latitude | Longitude | Resultado |
|---|---|---:|---:|---|
| EU-001 | Praça da Bandeira | -16.3751286 | -39.5881012 | marcador real |
| EU-002 | Praça da Liberdade | -16.3734370 | -39.5905262 | marcador real |
| EU-004 | Praça do Pequi | -16.3714765 | -39.5779847 | marcador real |

Os outros 17 itens continuam no catálogo, mas sem marcador inventado: aparecem como **coordenada pendente** até haver endereço ou coordenada verificável. A existência documental de um local não foi tratada como prova de posição exata, acesso, segurança, horário ou operação atual.
