# Critérios exatos para selecionar os cinco pontos-piloto de Eunápolis

## Regra principal

Os cinco pontos não devem ser escolhidos por fama, quantidade de informações no catálogo ou facilidade de colocar um marcador no mapa. Devem ser escolhidos pela combinação de **evidência, autorização, acesso, segurança, operação do QR e valor para o usuário**.

Um ponto só pode ser publicado se passar por todos os critérios eliminatórios e atingir pelo menos **75 de 100 pontos** na matriz abaixo.

## Critérios eliminatórios

Se qualquer item abaixo falhar, o ponto fica fora da primeira edição, mesmo que tenha alto valor turístico:

1. **Existência confirmada:** fonte primária ou responsável local confirma o nome e a existência do ponto.
2. **Identidade inequívoca:** o nome, endereço e localização não se confundem com outro equipamento ou área.
3. **Coordenada de campo:** latitude e longitude conferidas presencialmente. A margem desejável é de até 15 metros para um ponto fixo; se for uma área, registrar a âncora como área e não como ponto exato.
4. **Autorização:** existe autorização documentada para visitação e instalação do QR, ou declaração formal de acesso público quando não houver instalação física.
5. **Responsável:** há uma pessoa ou órgão que pode comunicar fechamento, obra, mudança ou remoção do QR.
6. **Acesso no período:** o local estará acessível durante toda a janela do piloto, ou possui horário publicado e estável.
7. **Risco controlável:** não há risco evidente não tratado de tráfego, violência, queda, água, obra, propriedade privada ou travessia perigosa.
8. **QR instalável:** existe superfície, visibilidade, proteção contra chuva e possibilidade de substituição do QR.
9. **Conectividade testada:** em três testes realizados em horários diferentes, o carimbo funciona ou há um mecanismo offline claramente marcado como pendente.
10. **Sem promessa falsa:** o ponto não exige publicar como fato uma trilha, cachoeira, rota, horário, acessibilidade ou condição que ainda não foi verificada.

O ponto que falhar em um critério eliminatório deve receber status `pendente` ou `fora_da_edicao`, nunca apenas uma nota menor.

## Matriz de pontuação

| Dimensão | Pontos | Como pontuar |
|---|---:|---|
| Evidência e fonte | 20 | 20: fonte pública primária e confirmação local; 12: fonte documental forte sem confirmação local; 5: somente fonte secundária; 0: candidato cartográfico sem validação |
| Validação de campo | 20 | 20: nome, coordenada, acesso e condição conferidos na data; 10: conferência parcial; 0: sem vistoria |
| Autorização e responsável | 15 | 15: autorização e responsável nominal; 8: responsável confirmado sem autorização formal; 0: ninguém responde pelo ponto |
| Acesso e segurança | 15 | 15: acesso, travessias, piso, iluminação e riscos registrados; 8: riscos parcialmente avaliados; 0: risco desconhecido ou não controlável |
| QR e infraestrutura | 10 | 10: QR visível, protegido, substituível e com conectividade testada; 5: instalação possível com ressalva; 0: QR não pode ser mantido |
| Valor para o usuário | 10 | 10: experiência clara, diferenciada e compreensível; 5: valor moderado; 0: ponto sem experiência definida |
| Integração na rota | 5 | 5: entra naturalmente no traçado validado; 3: conexão possível; 0: exige deslocamento não validado |
| Diversidade editorial | 5 | 5: cobre categoria ausente sem duplicar os demais; 3: categoria parcialmente repetida; 0: redundante |
| **Total** | **100** | **Aprovado somente com 75+ e sem falha eliminatória** |

## Distribuição obrigatória dos cinco pontos

A primeira edição deve conter diversidade, mas não deve espalhar pontos pela cidade a ponto de transformar o piloto em uma operação de transporte.

A composição recomendada é:

- **3 pontos urbanos centrais ou próximos**, com acesso simples e maior chance de uso repetido;
- **1 ponto de natureza urbana**, com condição e acesso verificáveis;
- **1 ponto cultural ou comunitário**, com responsável e experiência própria.

Também aplicar estes limites:

- no máximo dois pontos do mesmo tipo;
- pelo menos um ponto que não seja praça;
- nenhum ponto regional fora de Eunápolis na primeira edição;
- nenhuma rota eventual de evento como ponto permanente;
- distância total da rota somente após medição de campo;
- preferência por um circuito coerente, mas sem forçar conexão insegura.

## Candidatos iniciais

Os candidatos mais coerentes com o catálogo existente são:

1. **Praça da Bandeira** — candidata urbana central; já possui coordenada conferida e uso cívico documentado.
2. **Praça da Liberdade** — candidata urbana; já possui coordenada conferida e requalificação documentada.
3. **Praça do Pequi** — candidata urbana; já possui coordenada conferida e intervenção municipal documentada.
4. **Parque Ecológico do Gravatá** — candidata de natureza urbana; precisa de vistoria de acesso, pista, segurança, horário e condição atual.
5. **Viola de Bolso** ou **Mercado Municipal Dona Alzira** — candidato cultural/comunitário; somente um deve entrar, após confirmação de responsável, endereço, funcionamento e autorização.

Essa lista é uma **shortlist de pesquisa**, não uma aprovação. Os três primeiros têm vantagem cartográfica, mas ainda precisam da confirmação de campo e da operação do QR. O Gravatá e o quinto ponto não devem ser publicados antes da validação presencial.

## Pontos que não devem entrar na primeira edição

- **Estrada da Colônia / ciclofaixa:** infraestrutura documentada, mas endpoints e segurança estão pendentes; pode entrar em edição posterior após medição e avaliação de tráfego.
- **Circuito Sesc:** evento temporal, não ponto permanente.
- **Cruz da primeira missa:** status jurídico pendente.
- **Circuito cultural central:** proposta editorial, não rota oficial.
- **Track comunitário de pedal:** acesso, superfície e segurança não validados.
- qualquer ponto com coordenada pendente, responsável ausente ou obra ativa.

## Ficha de aprovação de cada ponto

Antes de publicar, preencher e arquivar:

```text
point_id:
nome oficial:
categoria:
endereço:
latitude:
longitude:
tipo de coordenada: ponto_exato | âncora_de_área
fonte documental:
evidência literal/paráfrase:
data da vistoria:
responsável e contato:
autorização para QR:
horário/acesso:
piso e travessias:
iluminação:
acessibilidade conhecida:
riscos e restrições:
local de instalação do QR:
conectividade em três testes:
foto da vistoria:
validado por:
nota final:
status: publicado | pendente | fora_da_edicao
valid_until:
```

## Teste de campo

A vistoria deve ocorrer antes da publicação e repetir-se durante o piloto. Em cada ponto:

1. chegar pelo trajeto que o usuário fará;
2. confirmar nome e endereço com responsável ou sinalização local;
3. registrar coordenada e precisão;
4. testar o QR com pelo menos dois aparelhos;
5. repetir o teste em três horários;
6. observar piso, travessias, iluminação e obstáculos;
7. registrar foto sem expor pessoas sem consentimento;
8. confirmar como suspender ou substituir o QR;
9. anotar qualquer divergência no catálogo;
10. obter aprovação final do operador.

## Decisão final

Os cinco pontos entram na edição somente quando houver cinco fichas completas, média mínima de 75 pontos, zero falhas eliminatórias e uma rota testada entre eles.

Se apenas três pontos passarem, lançar uma edição de três pontos. É melhor um piloto menor e verdadeiro do que completar cinco com itens frágeis para cumprir uma meta artificial.
