# Homologação física Android — Mais1km

**Data do teste:** 07/11/2026  
**Plataforma:** Android físico  
**Aplicativo:** APK Capacitor de validação  
**Fluxo:** App Link da TAG → localização → carimbo/carta → retorno à coleção

## Evidências observadas

| Etapa | Resultado |
|---|---|
| Abrir o link da TAG | Aprovado |
| Android oferecer APK ou navegador | Aprovado |
| Escolher APK e abrir o aplicativo | Aprovado |
| Confirmar localização | Aprovado |
| Processar o carimbo | Aprovado |
| Adicionar a carta à caderneta | Aprovado |
| Tocar em “Voltar para coleção” | Falhou: retornou à página de carimbo |

O modelo do aparelho, versão do Android e código da TAG não foram informados e não são presumidos neste registro.

## Diagnóstico no código

A tela de sucesso da TAG usava um link comum para `/`. No Android Capacitor, isso fazia uma navegação completa do WebView. Na inicialização, `client/src/main.js` consultava `App.getLaunchUrl()` e priorizava novamente o App Link da TAG, reabrindo a tela de carimbo em vez de mostrar a coleção.

## Correção aplicada nesta branch

- Os links de sucesso passaram a retornar com `/?retorno=colecao`.
- Os links de saída/erro retornam com `/?retorno=home`.
- O `main.js` reconhece o retorno antes de consultar `App.getLaunchUrl()`, mas mantém o listener `appUrlOpen` ativo para futuras TAGs.
- O `app.js` inicia diretamente na view `collection` quando recebe `retorno=colecao` e remove o parâmetro do histórico.
- Foram adicionados testes automatizados para proteger esse comportamento.

## Situação

**Teste físico original:** parcialmente aprovado.  
**Correção no código:** aplicada na branch de trabalho; ainda depende de CI e de novo teste físico com APK atualizado.  
**Homologação final:** pendente até repetir o fluxo completo e confirmar que a coleção abre após o carimbo.

Esta correção não altera API, banco de dados, regras de carimbo, geofence ou produção.
