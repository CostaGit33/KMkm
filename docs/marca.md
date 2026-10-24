# +1 KM — guia de marca

Resumo para quem for usar o nome e o logo do +1 KM (site, material impresso, apresentação, loja de apps). Os valores abaixo vêm do código do app (`client/src/brand-system.css`), não de um padrão novo.

## Nome

**+1 KM**, com espaço entre "1" e "KM". Em texto corrido: "o +1 KM". Não usar "Mais 1 km", "+1KM" nem "Caderneta de Rotas" (nome antigo, descartado).

**Descrição de uma linha** (para loja, rodapé, assinatura de e-mail): *Carimbe pontos reais da cidade com o celular e monte sua caderneta de rotas.*

**Tom de voz:** leve e direto, de quem anda a pé. Verbos de movimento (caminhar, carimbar, achar). Sem jargão técnico com o público; "tag NFC" só quando for explicar o toque.

## Logo

Arquivos em `client/public/marca/` (ficam publicados em `/marca/...`).

| Arquivo | Uso |
|---|---|
| `simbolo.svg`, `simbolo-512.png` | Foto de perfil, ícone de loja, favicon de material externo. Selo redondo com "+1 KM". |
| `logo-horizontal.svg`, `-1200.png` | Fundo escuro (verde-floresta). Versão principal. |
| `logo-horizontal-claro.svg`, `-1200.png` | Fundo claro (creme ou branco). |
| `logo-mono-claro.svg` | Uma cor só, creme, sobre verde ou foto escura. |
| `logo-mono-escuro.svg` | Uma cor só, verde-floresta profundo, para impressão em uma cor, carimbo e bordado. |

Os textos dos SVG estão convertidos em curvas, então não dependem de fonte instalada.

**Área de respiro:** deixe ao redor do logo, no mínimo, a largura da letra "K".
**Tamanho mínimo:** logo horizontal com 80 px de largura (ou 25 mm impresso); símbolo com 32 px.
**Não faça:** esticar, girar, trocar as cores por outras fora da paleta, pôr sobre fundo que reduza o contraste, aplicar sombra ou brilho.

## Cores

| Nome | Hex | Uso |
|---|---|---|
| Floresta profunda | `#081D14` | Fundo principal (tema escuro), texto no tema claro |
| Floresta | `#1A472E` | Cartões e superfícies elevadas |
| Verde | `#1F593A` | Destaques, botões secundários, áreas de cor cheia |
| Dourado | `#C2A169` | Cor de ação e de marca: botões, ícones, "KM" |
| Creme | `#F2E8DC` | Texto no tema escuro, fundo no tema claro |
| Dourado escuro | `#8A6938` | Dourado sobre fundo claro (o dourado normal não tem contraste suficiente no creme) |

**Contraste (calculado):**

| Combinação | Razão | Pode usar para |
|---|---|---|
| Creme sobre floresta profunda | 14,5 : 1 | Qualquer texto |
| Dourado sobre floresta profunda | 7,2 : 1 | Qualquer texto |
| Creme sobre verde | 6,8 : 1 | Qualquer texto |
| Creme sobre floresta | 8,7 : 1 | Qualquer texto |
| Dourado sobre floresta | 4,3 : 1 | Texto normal (limite de 4,5 não é atingido): só texto grande ou ícone |
| Dourado sobre verde | 3,4 : 1 | Só elementos gráficos e texto grande |
| Dourado escuro sobre creme | 4,2 : 1 | Só texto grande, títulos e ícones |
| Floresta profunda sobre creme | 14,5 : 1 | Qualquer texto |

Sem azul. Vermelho só para erro, e no app o erro já usa um tom rosado (`#E5A49A`).

## Tipografia

- **Títulos e logo:** Alfa Slab One (licença SIL OFL, uso livre).
- **Texto de apoio e rótulos:** Special Elite (licença SIL OFL), com o clima de carimbo e máquina de escrever.
- **Texto longo em páginas e documentos:** fonte do sistema (`system-ui`), para leitura confortável.

## Aplicações

- **Cartão de patrocinador** ("Patrocinado por X"): logo do patrocinador sempre menor que o do +1 KM, em um bloco próprio, nunca dentro do selo.
- **Placa de rua (tag NFC):** símbolo em verde e dourado; o texto "Encoste o celular" em creme sobre verde profundo.
- **Documentos impressos:** logo claro no cabeçalho, corpo em floresta profunda sobre branco ou creme.

## Inconsistências encontradas no app (a corrigir)

1. **Ícone do app com cores antigas.** `client/public/icon.svg` usa `#d9a84a`, `#3fae7a` e `#12281e`, que não são as cores da paleta atual. O novo `simbolo.svg` segue a paleta. Trocar o ícone do PWA e o da Google Play pelo novo símbolo exige regerar os PNGs 192/512/maskable e subir o `CACHE_NAME` do `sw.js`; não foi feito nesta etapa.
2. **Fontes declaradas, mas não carregadas.** O CSS pede Alfa Slab One e Special Elite, mas o app não carrega nenhuma das duas (sem `@font-face` nem link). Os aparelhos mostram Georgia e Courier New no lugar. Para a marca aparecer como descrita aqui, é preciso empacotar as fontes no app (os pacotes `@fontsource/alfa-slab-one` e `@fontsource/special-elite`, ambos OFL, servem).
3. **Duas paletas nas páginas públicas.** As páginas estáticas (`como-funciona`, `privacidade` etc.) usam `#0b1a14`/`#e5bd52`, tons próximos mas diferentes dos da marca.
