# +1 KM · Caderneta de Rotas

PWA mobile-first de **carimbos em tags NFC e QR Code** fixadas em pontos reais de Eunápolis (BA). A pessoa caminha ou pedala pela cidade, encosta o celular na tag (ou lê o QR) e **carimba** a caderneta. Cada ponto novo desbloqueia uma **carta de personagem**; rotas completas dão certificado, eventos e patrocínios abrem edições numeradas, e cada ponto pode mostrar fotos atuais e históricas do lugar.

> **Estado:** piloto controlado em Eunápolis. Riscos e gatilhos de parada: [docs/riscos-piloto-eunapolis.md](docs/riscos-piloto-eunapolis.md). Versão atual e histórico: [CHANGELOG.md](CHANGELOG.md). Pendências: [TODO.md](TODO.md).

## O que o produto faz

| Para quem | O que oferece |
|---|---|
| **Participante** | Conta com e-mail e senha; mapa com os pontos; rotas e circuitos; carimbo por NFC/QR; coleção de cartas; XP, nível e pódio mensal opcional; certificado; fotos dos pontos; exclusão de conta. |
| **Administração** (`/admin`) | Criar, editar, publicar e arquivar pontos; montar circuitos e rotas; cadastrar eventos e patrocínios; aprovar fotos; gerenciar pessoas e auditoria. |
| **Operação** | Relatórios do piloto, chaves das TAGs, publicação de pontos e monitoramento da API. |

## Tecnologia

| Camada | Implementação |
|---|---|
| Servidor | Node.js, Express, MySQL, migrations, mídia e integrações existentes. |
| Cliente | Vite, JavaScript, HTML, CSS, React em componentes específicos, Leaflet e Service Worker PWA. |
| Android oficial | Capacitor 8 em `client/android`, usando o bundle local `client/dist`; mesmas telas e regras do PWA, com plugins nativos quando necessários. |
| Flutter | `mobile/` preservado como implementação histórica; não é a base oficial do Android. |

## Validar PWA e Capacitor

```bash
npm ci --prefix client
npm test --prefix client
npm run build --prefix client
npm run build:android --prefix client
npm run cap:sync:android --prefix client
```

O Android exige Android SDK e Java 21. A publicação exige assinatura permanente e homologação conforme [docs/PLAY-STORE.md](docs/PLAY-STORE.md).

## Documentação

- [Arquitetura Capacitor](docs/capacitor/README.md)
- [Auditoria de paridade e Play Store](docs/capacitor/AUDITORIA-PARIDADE-PLAY-STORE.md)
- [Checklist de publicação](docs/PLAY-STORE.md)
- [Arquitetura](docs/MAPA-ARQUITETURA.md) · [Fluxos](docs/FLUXOS-SISTEMA.md) · [Segurança](docs/seguranca.md)

## Limites conhecidos

O carimbo por NFC comum não prova presença física. Login/cookies, GPS, NFC/App Links e paridade completa precisam de homologação em dispositivo Android real. Não há confirmação de carimbo offline.