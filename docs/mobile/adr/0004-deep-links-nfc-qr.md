# ADR-0004 — Deep links para tags NFC/QR

**Status:** proposta; configuração bloqueada até confirmar domínio e assinatura.
**Data:** 2026-11-01

## Contexto

As tags atuais abrem URL web `/t/:codigo?k=...`; a PWA captura a chave, remove-a da barra de endereço e a envia ao backend no carimbo. Não há leitor NFC Flutter no repositório. `applicationId`, domínio verificado e fingerprint de assinatura não estão documentados.

## Decisão proposta

Preservar formato e tags atuais. Quando o app existir, verificar Android App Links para domínio real e caminhos exatos `/t/...`, deixando o navegador/PWA como fallback. A abertura via NFC e QR deve chegar à mesma validação do backend; não implementar um caminho de carimbo local.

## Consequências e bloqueios

Não gerar `assetlinks.json`, intent filters finais ou fingerprints até confirmar package name, domínio, certificados e conta de publicação. Não comprar/substituir tags sem teste em aparelhos e autorização. Tratar `k` como credencial: remover de logs, analytics e crash reports.
