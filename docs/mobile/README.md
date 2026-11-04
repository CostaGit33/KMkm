# Migração Android Mais1km

Documentação do cliente Android Flutter. O app complementa a PWA e usa a API existente como fonte de dados; o MySQL permanece como fonte oficial.

- [Baseline e toolchain](00-baseline.md)
- [Escopo do MVP](01-escopo-mvp.md)
- [Mapa da API](02-mapa-api.md)
- [Arquitetura móvel](03-arquitetura-mobile.md)
- [ADRs — decisões de arquitetura](adr/README.md)

## Estado atual (2026-11-03)

O código Flutter está em `mobile/`, com `applicationId` confirmado como `online.novaagencian8n.mais1km`. O app inclui autenticação e sessão segura, recuperação de senha, catálogo/mapa, rotas e caderneta, telas de perfil e pódio, participação opcional no ranking, entrada de link NFC/QR e envio de carimbo. A localização é solicitada somente quando a API informa que o ponto exige GPS.

O mapa nativo Google é opcional: sem chave Android configurada o app mantém o fallback OpenStreetMap. Uma chave, quando usada, deve ser específica para Android e restrita ao package name e fingerprint do certificado; não deve ser versionada no repositório. Veja `mobile/README.md` para configuração e build.

O workflow `.github/workflows/mobile.yml` instala dependências, executa `flutter analyze --fatal-infos`, `flutter test`, gera um APK debug e publica o artefato do GitHub Actions por sete dias. O APK debug serve para avaliação; ainda não é um APK de release assinado nem está pronto para publicação na Play Store.

## Validação pendente e bloqueios

- Ainda é necessário testar em aparelho/emulador a persistência da sessão após reiniciar, o logout revogando a sessão no servidor, recuperação de senha, permissões de GPS e o fluxo NFC/QR ponta a ponta. Use uma conta descartável e não carimbe pontos reais sem autorização.
- Android App Links exigem publicar `https://mais1km.novaagencian8n.online/.well-known/assetlinks.json` com o `applicationId` e o SHA-256 do certificado usado na distribuição. O filtro Android no app, sozinho, não verifica o domínio.
- O mapa Google só será exibido quando a chave Android compatível estiver configurada no build; sem ela, o mapa permanece em OSM. A chave web do PWA não deve ser reutilizada no APK.
- Os testes de API/telas cobrem contratos e validações locais, mas não substituem testes instrumentados de rede, GPS, câmera/NFC ou sessão real. Eventos e outras funcionalidades não disponíveis no app ainda precisam ser comparados com a PWA antes de declarar paridade integral.

Nenhuma publicação na Play Store ou alteração de infraestrutura/produção é realizada por este documento. Consulte os ADRs para decisões adiadas ou ainda dependentes de ambiente.
