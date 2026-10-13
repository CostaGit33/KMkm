# Conclusão

O +1KM **não deve adicionar um agregador de APIs ao caminho principal do mapa**. O produto atual já tem catálogo editorial, Leaflet, proxy próprio de tiles e pontos estáticos; `real-map.js` somente renderiza pontos que possuem `lat/lng`, enquanto vários itens ainda não têm posição validada. A integração mais valiosa, se houver uma necessidade de produto comprovada, é um piloto **server-side de rotas com openrouteservice (ORS)**. Em paralelo, Nominatim pode ser usado **somente em fluxo editorial/backoffice**, para candidatos de geocodificação fornecidos explicitamente por um editor. Open-Meteo e Wikidata são complementos opcionais e devem ficar fora do mapa até que uma interface real demonstre seu valor.

A recomendação operacional é:

1. **Manter a base e o mapa existentes**, sem chamadas novas no navegador.
2. **Preservar a proveniência e o estado de cada coordenada**: coordenada exata, âncora aproximada ou pendência. Nenhum upstream deve transformar uma sugestão em posição publicada automaticamente.
3. **Pilotar ORS** para duas ou três rotas com pontos de origem/destino já conferidos, retornando apenas GeoJSON e resumo sanitizados ao Leaflet. Elevação só deve ser chamada se houver tela de perfil/desnível.
4. **Pilotar Nominatim apenas editorialmente**, com fila serializada, cache persistente, revisão humana e respeito à política pública. Não implementar autocomplete, geocodificação por usuário em tempo real ou chamadas diretas do cliente.
5. **Considerar clima e enriquecimento Wikidata somente como cartões ou metadados**, não como camada automática do mapa. Para app comercial, o uso de Open-Meteo deve migrar para plano/API comercial antes de produção.
6. **Rejeitar a integração de ViaCEP e Strava neste momento**; BrasilAPI fica apenas como opção condicional para um formulário de endereço real, não como fonte cartográfica.

## Decisão executiva

| Prioridade | API | Valor para o +1KM | Esforço estimado | Decisão | Motivo curto |
|---:|---|---:|---|---|---|
| 1 | [openrouteservice](#openrouteservice) | 7/10 | Médio-alto | **Pilotar** | Única opção com ganho direto para uma experiência de rota calculada; exige chave, proxy, quotas e validação local. |
| 2 | [IBGE — localidades](#ibge--localidades-e-códigos-municipais) | 6/10 | Baixo-médio | **Manter existente / não integrar agora** | Útil para código, nome, UF e hierarquia oficial; não fornece POIs, rotas, tiles ou conteúdo turístico. |
| 3 | [Nominatim](#nominatim) | 6/10 | Médio | **Pilotar editorialmente** | Pode ajudar a preencher candidatos pendentes, mas o serviço público não é autocomplete nem base para geocodificação runtime. |
| 4 | [Open-Meteo](#open-meteo) | 6/10 | Baixo-médio | **Pilotar como cartão** | Previsão pode apoiar visita, caminhada e pedal; não deve ser chamada por marcador nem usada como alerta de segurança. |
| 5 | [Wikidata](#wikidata) | 6/10 | Médio | **Pilotar como enriquecimento** | IDs, rótulos e contexto são úteis após confirmação humana; cobertura de pontos locais é desigual. |
| 6 | [BrasilAPI](#brasilapi) | 4/10 | Baixo-médio | **Manter fora por ora** | CEP/IBGE/feriados são auxiliares e duplicariam camadas existentes; considerar apenas se surgir formulário de endereço. |
| 7 | [ViaCEP](#viacep) | 2/10 | Baixo | **Rejeitar** | Resolve endereço/CEP, mas não latitude, POI, rota ou mapa; não substitui Nominatim. |
| 8 | [Strava API v3](#strava-api-v3) | 2/10 | Alto | **Rejeitar** | OAuth e políticas atuais não sustentam um feed comunitário republicado; o app pode manter links externos para o Strava. |

> **Como ler os escores:** os valores reproduzem a avaliação fornecida para cada API. “Esforço estimado” é uma classificação arquitetural complementar, não uma promessa de prazo; considera credenciais, limites, persistência, revisão e obrigações de dados.

## Estado dos dados e da posição geográfica

A caderneta deve tratar posição como dado editorial com proveniência explícita, e não como um simples par `lat/lng`:

- **Coordenada exata/verificada**: posição conferida por fonte adequada e revisão editorial, com `lat`, `lng`, fonte, data e observação. Pode ser usada para exibir o ponto e, quando a qualidade da fonte permitir, como entrada de uma rota.
- **Âncora**: posição aproximada de uma área, município, sede, praça, entrada ou centroide. Serve para contexto visual e descoberta, mas **não comprova o ponto exato, acesso, segurança ou traçado**. Deve ser marcada na interface e não deve ser usada silenciosamente como endpoint de navegação.
- **Pendência**: item sem coordenada confiável. Deve continuar no catálogo editorial, mas ser omitido do mapa, de rotas e de previsões por ponto. Sugestões de Nominatim, Wikidata, CEP ou outro serviço permanecem pendentes até confirmação humana.

No estado fornecido, três pontos de Eunápolis têm coordenadas verificadas (`EU-001`, `EU-002` e `EU-004`); os demais 17 itens permanecem pendentes. O fato de uma API retornar uma coordenada não prova acesso, operação, horário, segurança, validade turística ou existência atual do local.

## Ranking e análise por API

### 1. openrouteservice

**Valor:** 7/10. **Decisão:** piloto pequeno, server-side.

ORS oferece Directions e, separadamente, Elevation. A cobertura declarada é global e usa dados do OpenStreetMap, o que torna plausível o uso no Brasil; isso não garante qualidade uniforme em cidades pequenas, trilhas, ciclofaixas ou caminhos de acesso. O caso de uso adequado é calcular uma prévia entre pontos já conferidos, com perfil escolhido pelo produto, não provar que uma rota existe ou que é segura.

O plano Standard informado oferece 2.000 Directions/dia e 40/minuto, e os mesmos limites para Elevation; há limites de distância, waypoints e vértices. A chave deve ficar no servidor, em variável de ambiente. O host canônico é `api.heigit.org`; não se deve depender do host antigo `api.openrouteservice.org`.

**Implementação recomendada:** endpoint allowlisted no Express, perfis permitidos, validação `[lon, lat]`, limite de waypoints/tamanho, timeout, cache por parâmetros normalizados, limitação por usuário/IP e por chave upstream, tratamento de 403/429/5xx e resposta somente com GeoJSON/summary sanitizados. Chamar Elevation apenas quando a UI realmente exibir perfil ou ganho/perda. Exibir atribuição de ORS/HeiGIT e OpenStreetMap, e declarar que a rota é calculada e aproximada.

**Riscos principais:** chave exposta, quotas, manutenção/migração do host, atraso de atualizações do OSM, snapping de até 350 m, coordenadas na ordem errada, SRTM de resolução aproximada e falsa percepção de segurança. O serviço não deve ser a fonte única para decisão crítica.

### 2. IBGE — localidades e códigos municipais

**Valor:** 6/10. **Decisão:** manter o desenho atual; adicionar somente se houver requisito de metadado oficial.

A API fornece códigos municipais, nomes, UF e hierarquia administrativa, e consultas sem credencial responderam normalmente. É adequada para validar ou enriquecer `CITY_OPTIONS` e para gerar um snapshot versionado; não entrega POIs turísticos, endereços geocodificados, rotas, tiles ou geometria cartográfica. A diferença entre a lista de localidades e a Malha Municipal Digital também impede usá-la como substituta de geometria.

**Implementação recomendada:** consulta server-side ou em build, apenas endpoints allowlisted, snapshot local de código/nome/UF/hierarquia, atualização de baixa frequência (por exemplo, mensal ou a cada publicação territorial), cache de 30 dias, timeout e fallback stale. O cliente deve tolerar campos administrativos ausentes e não hardcodar contagens. Validar atribuição e permissões antes de republicar em escala, pois não foi encontrada licença específica da API.

### 3. Nominatim

**Valor:** 6/10. **Decisão:** piloto exclusivamente editorial/backoffice; não adicionar ao runtime do mapa.

A instância pública `nominatim.openstreetmap.org` oferece Search, Reverse, Lookup e Status. Search aceita consultas livres/estruturadas e `countrycodes=br`, mas não é autocomplete. Reverse devolve um resultado baseado no objeto OSM adequado mais próximo e pode retornar algo inesperado ou não indexar objetos pequenos.

A política exige User-Agent ou Referer identificável, atribuição, cache e proxy para apps. O teto é de 1 requisição/s por aplicação, agregado entre usuários; para scripts longos ou regulares, a política é mais restritiva: 4 requisições/minuto, uma thread e uma máquina, com cache. São proibidos autocomplete client-side, reverse em grade, consultas sistemáticas, coleta de todos os POIs e scraping automático.

**Implementação recomendada:** editor fornece explicitamente nome/endereço; rota server-side normaliza consulta, restringe `countrycodes=br`, usa `format=jsonv2` e limite pequeno, fila serializada e cache persistente. Armazenar `osm_type`, `osm_id`, candidato escolhido, licença, timestamp e evidência; exigir confirmação humana e fonte complementar. Sem correspondência confiável, preservar `pending`. O endpoint upstream deve ser configurável para troca imediata. Nunca enviar dados pessoais ou endereços sensíveis.

### 4. Open-Meteo

**Valor:** 6/10. **Decisão:** piloto como cartão por destino ou início de rota.

O `/v1/forecast` oferece condições atuais e previsões diárias/horárias. Consultas para Eunápolis retornaram previsão e fuso `America/Sao_Paulo`; as coordenadas retornadas são da grade meteorológica próxima, não uma observação pontual exata. O Brasil tem cobertura por modelos globais, mas a existência de resolução de até 1 km em alguma documentação não significa resolução de 1 km para todo o Brasil.

A camada gratuita informada é para uso não comercial e tem limites de menos de 10.000 chamadas/dia, 5.000/hora e 600/minuto, além do teto mensal informado; produtos com anúncios, assinatura ou outra finalidade comercial devem usar a API/plano apropriado. Os dados exigem crédito, link para CC BY 4.0 e indicação de alterações.

**Implementação recomendada:** `/api/weather` no servidor, apenas para destinos com coordenada exata ou âncora explicitamente marcada, pedidos curtos de `current` e `daily`, cache de 15–30 minutos ou mais, limite por IP, timeout, resposta stale e fallback sem cartão. Não chamar por todos os marcadores e não usar para alertas oficiais, interdição de trilha ou segurança.

### 5. Wikidata

**Valor:** 6/10. **Decisão:** piloto read-only, cache-first e editorial.

Wikidata oferece itens municipais, rótulos/descrições em português, coordenadas declaradas e contexto. Consultas encontraram itens para Eunápolis; geosearch também retornou candidatos próximos, mas quantidade de resultados não é métrica de completude ou qualidade. Buscas por pontos locais específicos podem não encontrar item.

**Implementação recomendada:** aceitar `wikidataId` opcional, usar `wbsearchentities` apenas para sugerir candidato e exigir confirmação. Depois, consultar IDs conhecidos via Action API/EntityData, armazenando ID, rótulo, descrição, coordenada, URL, `retrieved_at`, origem e confiança. Usar User-Agent identificável, gzip, baixa concorrência, cache, backoff e `Retry-After`; não usar SPARQL no caminho interativo e não escrever dados no piloto. Wikidata é CC0, mas atribuição e mecanismo de correção são boas práticas.

Coordenada Wikidata pode ser centroide, sede, âncora ou estar desatualizada. Ela nunca deve sobrescrever silenciosamente a coordenada exata ou a pendência editorial.

### 6. BrasilAPI

**Valor:** 4/10. **Decisão:** não integrar agora; somente opção condicional para endereço/CEP.

BrasilAPI agrega CEP, localidades IBGE, feriados e outros cadastros. A resposta de CEP V2 pode conter latitude/longitude, mas a própria documentação alerta para erros de coordenadas OSM. Isso não é base de POIs, trilhas ou roteamento. O serviço é descrito como experimental/beta, sem quota numérica ou SLA público identificados.

Se surgir um formulário real, fazer piloto server-side aceitando apenas CEP de oito dígitos ou UF validada, com endpoint allowlisted, timeout, cache/deduplicação, limite por IP, circuit breaker e campos `provider`/`checked_at`. Tratar coordenada como candidata e revisar; não aceitar URL arbitrária, chamadas client-side ou endpoints amplos sem relação com o produto. Os termos anti-crawling e anti-full-scan devem ser respeitados.

### 7. ViaCEP

**Valor:** 2/10. **Decisão:** rejeitar no fluxo atual.

ViaCEP resolve um CEP para campos estruturados e permite busca inversa por UF, cidade e logradouro, mas não fornece latitude/longitude, POIs, rotas ou tiles. A documentação alerta que uso massivo para validar bases pode causar bloqueio automático por tempo indeterminado. A chamada direta também facilitaria rajadas e autocomplete inadequado.

Só faria sentido num formulário explícito de endereço, com servidor, validação estrita, cache de respostas positivas/negativas, limite por IP, sem busca a cada tecla e fallback manual. Mesmo nesse cenário, o resultado é uma sugestão de endereço, não localização turística nem prova de operação.

### 8. Strava API v3

**Valor:** 2/10. **Decisão:** rejeitar a integração.

A API exige OAuth 2.0 e consentimento do atleta. Tokens expiram em seis horas, refresh tokens são rotativos e os limites atuais informados são 200/15 min e 2.000/dia, com limites non-upload mais baixos. A política limita a exibição ao usuário autenticado, restringe dados de outros usuários e proíbe bulk export, corpus persistente e processamento agregado/anonimizado para analytics. Portanto, não é base segura para um feed comunitário de atividades no +1KM.

O app pode manter links externos para Strava Maps, heatmap ou rotas comunitárias. Se houver depois uma necessidade pessoal inequívoca, o piloto teria de ser server-side, com `activity:read` mínimo, tokens cifrados, webhook de revogação, exclusão verificável e visualização somente do próprio atleta. Não colocar segredos em `real-map.js`.

## Arquitetura server-side recomendada

### Princípios

- **Cliente chama somente rotas same-origin do +1KM** para geocodificação editorial, rotas, clima e enriquecimento. Nenhuma chave, token, User-Agent controlado ou política de quota deve depender do navegador.
- **Allowlist de upstreams e parâmetros**: não aceitar URL fornecida pelo cliente, proxy genérico, perfil arbitrário, campo arbitrário ou consulta sem limites.
- **Coordenadas com tipo e proveniência**: persistir `coordinate_status` (`exact`, `anchor`, `pending`), `lat`, `lng`, `source`, `source_id`, `checked_at`, `confidence` e `notes`. O mapa pode mostrar âncoras com símbolo/aviso distinto; `pending` não é desenhado.
- **Falha tolerante**: o catálogo e o mapa estático continuam funcionando sem qualquer upstream. Resposta stale deve trazer `retrieved_at` e aviso; sem cache, retornar “indisponível”/ausente, não inventar dado.
- **Observabilidade sem vazamento**: registrar fornecedor, rota interna, status, duração, cache hit/miss e contador de quota; não registrar tokens nem texto de endereço sensível em claro.

### Fluxo lógico

```text
Leaflet/UI
   │ same-origin, dados mínimos
   ▼
Express /api/* allowlisted
   ├─ autenticação/autorização da função
   ├─ validação de schema e estado da coordenada
   ├─ cache persistente + deduplicação em voo
   ├─ rate-limit por usuário/IP + bucket global por fornecedor
   ├─ timeout, retry limitado, backoff e circuit breaker
   ▼
Upstream específico (ORS, Nominatim, Open-Meteo, Wikidata ou IBGE)
   │
   └─ normalização, atribuição, proveniência e fallback stale
   ▼
Resposta mínima para a UI
```

### Cache, quotas e fallback por fornecedor

| Fornecedor | Cache recomendado | Limite/controle | Fallback |
|---|---|---|---|
| Nominatim | Persistente por consulta normalizada; guardar candidato, `osm_type/osm_id`, licença e data. | Fila única; teto agregado de 1 req/s por aplicação; jobs longos em 4 req/min, uma thread/máquina. | Manter pendente ou servir candidato já revisado; nunca geocodificar automaticamente. |
| ORS | Chave por perfil + waypoints + opções; TTL configurável e deduplicação. | 40/min e 2.000/dia por produto Standard para Directions/Elevation; controlar por chave e por usuário. | Rota editorial/estática existente, sem fingir que é rota calculada. |
| Open-Meteo | 15–30 min ou mais, por coordenada arredondada/destino e parâmetros. | Plano comercial se o app for comercial; no gratuito, observar limites publicados e bloquear fan-out. | Última previsão marcada com data ou nenhum cartão. |
| Wikidata | Cache persistente de IDs confirmados; geosearch somente como sugestão. | Baixa concorrência, User-Agent, backoff, `Retry-After`; observar limites dinâmicos. | Servir metadados locais; não remover ponto sem Wikidata. |
| IBGE | Snapshot versionado local, cache de 30 dias ou atualização por publicação. | Baixa frequência, timeout e rota allowlisted; não assumir ausência de quota. | Snapshot anterior/stale, com versão identificada. |
| BrasilAPI/ViaCEP | Cache positivo e negativo apenas para fluxo de endereço real; sem varredura. | Limite próprio mais restritivo; não há quota pública confiável e há políticas antiabuso. | Entrada manual e fonte local; não criar coordenada. |
| Strava | Se um dia existir modo pessoal: armazenamento cifrado e exclusão ligada à revogação. | Cabeçalhos `X-RateLimit-*`, 200/15 min e 2.000/dia; non-upload mais baixo. | Nenhuma camada Strava; links externos. |

O limitador atual em memória por IP não é suficiente para cumprir cotas agregadas quando há múltiplos processos ou réplicas. Para produção, usar armazenamento compartilhado (por exemplo, Redis ou serviço equivalente) para buckets globais, locks de deduplicação e circuit breakers. Enquanto houver uma única instância, o mesmo contrato deve ser respeitado por código e testes, sem tratar o bucket local como garantia de política upstream.

### Atribuição e licenças

- **OpenStreetMap/Nominatim:** atribuição visível de OpenStreetMap, observância da ODbL e política de uso do Nominatim. Atribuição não transforma a resposta em garantia de precisão.
- **ORS/HeiGIT:** atribuir openrouteservice/HeiGIT e OpenStreetMap; incluir aviso de rota calculada/aproximada e atribuição da fonte de elevação quando exibida. Verificar os termos vigentes antes de publicar.
- **Open-Meteo:** crédito visível, link para CC BY 4.0 e indicação de alterações quando houver.
- **Wikidata:** dados CC0; manter indicação de origem, link para item e mecanismo para reportar correções.
- **IBGE, BrasilAPI e ViaCEP:** registrar fornecedor e data; como não foi localizada uma licença API específica para todos os casos, validar permissão/atribuição antes de republicação em escala.
- **Strava:** respeitar API Agreement/Policy, consentimento, escopos mínimos, limites de exibição, revogação e exclusão. Não reutilizar atividade como corpus público.

## Fases de implementação

### Fase 0 — Base segura e inventário

1. Não alterar o mapa de produção nem adicionar chamadas upstream.
2. Migrar os pontos para um esquema explícito de `exact`, `anchor` e `pending`, com fonte, data e confiança.
3. Confirmar as três coordenadas já verificadas de Eunápolis; manter os outros 17 itens como pendentes até haver evidência.
4. Definir atribuição de OSM no mapa e garantir que falha de rede não impeça a caderneta.
5. Criar testes para rejeitar coordenadas fora de faixa, ordem `[lat,lng]` em endpoints que exigem `[lon,lat]`, parâmetros sem allowlist e itens pendentes em rotas/clima.

### Fase 1 — Snapshot administrativo (somente se necessário)

Criar job de build/server-side para IBGE, com snapshot versionado, cache de 30 dias, stale fallback e tolerância a campos ausentes. O mapa continua lendo dados locais; não usar a API de localidades no caminho de renderização.

### Fase 2 — Piloto editorial de Nominatim

Implementar uma fila de uma pessoa/um worker, consulta explícita e cache persistente. Mostrar candidatos com fonte e timestamp, exigir seleção humana e fonte complementar, e gravar apenas após revisão. Medir taxa de correspondência confiável para os itens pendentes; se não houver fluxo editorial real, não implantar a rota.

### Fase 3 — Piloto de rotas ORS

Para duas ou três rotas com pontos **exatos**, adicionar endpoint autenticado de pré-visualização. Testar perfil, waypoints, timeout, 403/429/5xx, cache e fallback para rota editorial. Exibir atribuição e texto de segurança. Só incluir elevação se usuários realmente precisarem de desnível.

**Critério de saída:** a UI deve diferenciar rota calculada de rota editorial/proposta e nunca sugerir que o cálculo prova acesso ou segurança.

### Fase 4 — Cartão meteorológico opcional

Adicionar `/api/weather` apenas para destinos selecionados, com cache, limite e fallback. Validar licenciamento comercial antes de produção. Testar coordenada exata versus âncora e exibir o local da previsão como grade/modelo aproximado.

### Fase 5 — Enriquecimento Wikidata

Adicionar `wikidataId` opcional no catálogo, consulta de IDs confirmados e cache read-only. Medir quantos pontos editoriais realmente ganham contexto; não transformar ausência de item em ausência do ponto.

### Fase 6 — Endereço condicional

Somente se houver formulário real de cadastro/edição, testar BrasilAPI ou ViaCEP server-side para sugestão de endereço. Não ligar nenhum dos dois ao posicionamento automático de atrações. Sem formulário, manter ambos fora.

### Fase 7 — Operação e revisão

Monitorar cache hit/miss, latência, erros, 429/403/5xx, chamadas por fornecedor, custo/licença, quantidade de coordenadas por estado e taxa de revisão humana. Revisar quotas, termos, hosts, versões e atribuições antes de cada publicação. Desligar uma integração sem remover o mapa estático.

## Rejeições e limites explícitos

- **Não implementar autocomplete:** Nominatim proíbe autocomplete client-side; ViaCEP e outros endpoints sem quota clara também não devem ser consultados a cada tecla.
- **Não fazer reverse em grade, coleta sistemática, varredura de CEP, lista completa de POIs ou scraping de páginas de detalhes.**
- **Não chamar APIs diretamente do navegador:** isso expõe chaves/tokens, dificulta quota global, cache, User-Agent, backoff e troca de fornecedor.
- **Não usar geocodificação para preencher automaticamente os 17 pontos pendentes.** Candidato é candidato; pendência continua pendência até confirmação.
- **Não usar CEP como coordenada exata:** CEP/área pode devolver aproximação ou campos incompletos.
- **Não usar Wikidata, OSM, ORS ou BrasilAPI como prova de funcionamento, acesso, segurança, horário ou operação turística.**
- **Não usar ORS para substituir Nominatim:** um roteador não é geocoder; os papéis são distintos.
- **Não usar clima como alerta oficial, interdição ou decisão de risco.**
- **Não criar feed comunitário de atividades Strava:** as políticas atuais e o modelo de consentimento não autorizam essa premissa.
- **Não colocar client secret, access token, refresh token ou chave ORS/Open-Meteo comercial em bundle, URL pública ou `real-map.js`.**
- **Não tratar CORS Yes/Unknown e Auth No do catálogo public-apis como licença, quota, SLA, qualidade ou autorização para uso pesado.** O catálogo é apenas mecanismo de descoberta.

## Critérios de aceite do piloto

1. O app funciona sem rede ou com qualquer upstream indisponível, mantendo catálogo e coordenadas já validadas.
2. Toda posição exibida tem estado (`exact` ou `anchor`), fonte e data; `pending` nunca entra silenciosamente no mapa/rota/clima.
3. Nenhuma requisição upstream é disparada diretamente pelo navegador.
4. Há cache persistente, deduplicação, timeout, limites por usuário/IP e bucket agregado por fornecedor.
5. Respostas stale são identificadas; ausência de resposta não vira dado inventado.
6. Atribuições são visíveis onde o dado é exibido e as licenças/termos são registradas.
7. 403/429/5xx, `Retry-After`, quotas e circuit breaker são testados.
8. Rotas calculadas, previsões e candidatos de geocodificação são visualmente distinguidos de conteúdo editorial conferido.
9. Existe um procedimento para trocar/desligar upstream sem alterar o cliente.
10. Métricas demonstram uso real da funcionalidade antes de ampliar o escopo.

## Referências numeradas

1. [Nominatim — documentação da versão atual](https://nominatim.org/release-docs/latest/)
2. [Nominatim — visão geral da API](https://nominatim.org/release-docs/latest/api/Overview/)
3. [Nominatim — Search](https://nominatim.org/release-docs/latest/api/Search/)
4. [Nominatim — Reverse](https://nominatim.org/release-docs/latest/api/Reverse/)
5. [Nominatim — Status](https://nominatim.org/release-docs/latest/api/Status/)
6. [OSMF — política de uso do Nominatim](https://operations.osmfoundation.org/policies/nominatim/)
7. [Nominatim — busca de Eunápolis](https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=3&countrycodes=br&q=Eun%C3%A1polis%2C%20Bahia%2C%20Brasil)
8. [Nominatim — reverse de Eunápolis](https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=-16.3766&lon=-39.5864&zoom=14)
9. [openrouteservice — desenvolvedores](https://openrouteservice.org/dev/)
10. [openrouteservice — Directions](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/)
11. [openrouteservice — Elevation](https://giscience.github.io/openrouteservice/api-reference/endpoints/elevation/)
12. [openrouteservice — restrições](https://openrouteservice.org/restrictions/)
13. [HeiGIT — planos e limites](https://account.heigit.org/info/plans)
14. [openrouteservice — FAQ](https://giscience.github.io/openrouteservice/frequently-asked-questions.html)
15. [openrouteservice — serviços e cobertura](https://openrouteservice.org/services/)
16. [HeiGIT — termos de serviço](https://account.heigit.org/info/tos)
17. [IBGE — documentação da API](https://servicodados.ibge.gov.br/api/docs)
18. [IBGE — localidades](https://servicodados.ibge.gov.br/api/docs/localidades)
19. [IBGE — lista de municípios](https://servicodados.ibge.gov.br/api/v1/localidades/municipios)
20. [IBGE — códigos dos municípios](https://www.ibge.gov.br/explica/codigos-dos-municipios.php)
21. [IBGE — dados abertos](https://www.ibge.gov.br/acesso-informacao/dados-abertos.html)
22. [IBGE — atualização territorial 2025](https://agenciadenoticias.ibge.gov.br/agencia-noticias/2012-agencia-de-noticias/noticias/46255-ibge-atualiza-dados-geograficos-de-estados-e-municipios-brasileiros-para-o-ano-de-2025)
23. [IBGE — Malhas territoriais](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html)
24. [BrasilAPI — site e documentação](https://brasilapi.com.br/docs)
25. [BrasilAPI — repositório](https://github.com/BrasilAPI/BrasilAPI)
26. [ViaCEP — site e documentação](https://viacep.com.br/)
27. [ViaCEP — contato e política de uso](https://viacep.com.br/faleconosco/)
28. [Open-Meteo — documentação](https://open-meteo.com/en/docs)
29. [Open-Meteo — termos](https://open-meteo.com/en/terms)
30. [Open-Meteo — preços](https://open-meteo.com/en/pricing)
31. [Open-Meteo — licença](https://open-meteo.com/en/licence)
32. [Open-Meteo — status](https://status.open-meteo.com/)
33. [Open-Meteo — previsão de Eunápolis](https://api.open-meteo.com/v1/forecast?latitude=-16.3766&longitude=-39.5864&current=temperature_2m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FSao_Paulo)
34. [Wikidata — acesso a dados](https://www.wikidata.org/wiki/Wikidata:Data_access)
35. [MediaWiki — Action API](https://www.mediawiki.org/wiki/API:Action_API)
36. [MediaWiki — geosearch](https://www.mediawiki.org/wiki/API:Geosearch)
37. [Wikidata — REST API e autenticação](https://www.wikidata.org/wiki/Wikidata:REST_API)
38. [Wikimedia — limites e etiqueta de API](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)
39. [Wikimedia — diretrizes de uso de APIs](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_API_Usage_Guidelines)
40. [Wikidata — política de interface estável](https://www.wikidata.org/wiki/Wikidata:Stable_Interface_Policy)
41. [Strava — getting started](https://developers.strava.com/docs/getting-started/)
42. [Strava — autenticação](https://developers.strava.com/docs/authentication/)
43. [Strava — rate limits](https://developers.strava.com/docs/rate-limits/)
44. [Strava — webhooks](https://developers.strava.com/docs/webhooks/)
45. [Strava — API Policy](https://developers.strava.com/guidelines/)
46. [Strava — API Agreement](https://www.strava.com/legal/api)
47. [Strava — Community Routes](https://support.strava.com/pt/articles/15401756-como-funcionam-as-rotas-da-comunidade-no-strava)
48. [public-apis — README e catálogo](https://raw.githubusercontent.com/public-apis/public-apis/master/README.md)
49. [OpenStreetMap — copyright e atribuição](https://www.openstreetmap.org/copyright)
50. [Wikimedia/Wikidata — exemplo de itens municipais consultados](https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q1796277%7CQ499922%7CQ808797&props=labels%7Cdescriptions%7Cclaims&languages=pt&format=json)

> As referências registram documentação, termos e verificações apontadas na pesquisa fornecida. Respostas vivas, limites, hosts, planos e políticas podem mudar; antes de colocar qualquer piloto em produção, revalidar os contratos e os endereços oficiais. O catálogo public-apis deve ser tratado apenas como índice de descoberta.
