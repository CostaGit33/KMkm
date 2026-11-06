# ADR 0001 — PWA como aplicação principal, Capacitor como camada Android

- **Status:** Aceito para implementação.
- **Data:** 2026-11-04.
- **Contexto:** o PWA contém a implementação mais completa, além da arquitetura, pesquisa de usuários, decisões de UX, fluxos e regras já trabalhados. A tentativa Flutter cria uma segunda interface e exige reconstrução e manutenção paralelas.
- **Decisão:** manter o PWA como única implementação das telas e jornadas. Usar Capacitor para empacotar o build web local em Android e fornecer ponte para APIs nativas quando necessário.
- **Consequências positivas:** preserva investimento existente, reduz duplicação de frontend, mantém PWA e Android alinhados e permite evolução web sem reimplementar telas.
- **Consequências e riscos:** diferenças entre browser e Android WebView precisam ser testadas; plugins nativos exigem manutenção; cookies HttpOnly, deep links, NFC e permissões precisam de validação real em aparelho.
- **Alternativas rejeitadas:** reescrever a aplicação em Flutter; criar um app Android que apenas abra a URL de produção (TWA/remote WebView) como substituto da aplicação local.
- **Restrições:** não mudar API/MySQL, regras de carimbo, TAGs ou produção para viabilizar o invólucro.
