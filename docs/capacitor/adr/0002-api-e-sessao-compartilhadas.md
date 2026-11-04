# ADR 0002 — API e sessão compartilhadas entre PWA e Android

- **Status:** Aceito como requisito; implementação técnica depende de teste no WebView.
- **Data:** 2026-11-04.
- **Contexto:** PWA e Android devem apresentar os mesmos dados e compartilhar a mesma conta. A API atual usa cookie `mais1km_session` HttpOnly; o login não retorna token no JSON.
- **Decisão:** manter a API Node/Express e MySQL existentes como fonte única da verdade. O cliente Capacitor não acessará o banco diretamente e não criará token, sessão ou regra paralela.
- **Sessão:** primeiro validar no Android WebView se o cookie HttpOnly é recebido, enviado em chamadas same-site e persiste após encerrar/reabrir o app. Não copiar o cookie para localStorage nem expô-lo ao JavaScript. Se a política do WebView exigir, avaliar uma ponte nativa de cookie segura e restrita.
- **Carimbo:** nunca marcar como concluído antes da resposta positiva do servidor. Sem rede, resultado indeterminado permanece não confirmado.
- **Localização:** pedir somente no momento do carimbo e conforme erro/solicitação da API; enviar `pos: { lat, lng, acc }` apenas para a operação.
- **Consequências:** a compatibilidade de cookies e CORS/CSRF será um gate técnico antes de habilitar autenticação real no app.
