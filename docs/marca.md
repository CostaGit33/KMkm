# +1 KM — guia de marca

Resumo para quem for usar o nome e o logo do +1 KM (site, material impresso, apresentação, loja de apps). Os valores abaixo vêm do código do app (`client/src/brand-system.css`), não de um padrão novo.

## Nome

**+1 KM**, com espaço entre "1" e "KM". Em texto corrido: "o +1 KM". Não usar "Mais 1 km", "+1KM" nem "Caderneta de Rotas" (nome antigo, descartado).

**Descrição de uma linha**: *Carimbe pontos reais da cidade com o celular e monte sua caderneta de rotas.*

**Tom de voz**: leve e direto, de quem anda a pé. Verbos de movimento (caminhar, carimbar, achar). Sem jargão técnico com o público; "tag NFC" só quando for explicar o toque.

## Logo

Arquivos em `client/public/marca/`.

| Arquivo | Uso |
|---|---|
| `simbolo.svg` | Foto de perfil, ícone de loja, favicon de material externo. |
| `logo-horizontal.svg` | Fundo escuro (verde-floresta). Versão principal. |
| `logo-horizontal-claro.svg` | Fundo claro (creme ou branco). |
| `logo-mono-claro.svg` | Uma cor só, creme. |
| `logo-mono-escuro.svg` | Uma cor só, verde-floresta profundo. |

Os textos dos SVG estão convertidos em curvas, então não dependem de fonte instalada.

## Cores

| Nome | Hex | Uso |
|---|---|---|
| Floresta profunda | `#081D14` | Fundo principal, texto em tema claro |
| Floresta | `#1A472E` | Superfícies elevadas |
| Verde | `#1F593A` | Destaques |
| Dourado | `#C2A169` | Cor de ação e de marca |
| Creme | `#F2E8DC` | Texto no tema escuro |
| Dourado escuro | `#8A6938` | Dourado sobre fundo claro |

## Tipografia

- **Títulos e logo:** Alfa Slab One.
- **Texto de apoio e rótulos:** Special Elite.
- **Texto longo em páginas e documentos:** `system-ui`.

## Inconsistências encontradas no app corrigidas

1. O ícone do PWA foi alinhado ao novo símbolo +1 KM.
2. As fontes Alfa Slab One e Special Elite foram carregadas no app.
3. A marca foi unificada com a paleta do sistema (`brand-system.css`).
