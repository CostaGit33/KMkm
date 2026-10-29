# Fluxos do sistema — KMkm / +1 KM

Este documento descreve os caminhos funcionais identificados no README, na API e nos módulos do servidor. É documentação técnica, não uma especificação de interface pixel a pixel.

## 1. Jornada principal do participante

```mermaid
flowchart TD
  A["Abrir PWA"] --> B{"Já possui conta?"}
  B -->|Não| C["Criar conta"]
  B -->|Sim| D["Entrar"]
  C --> E["Sessão autenticada"]
  D --> E
  E --> F["Explorar mapa / rotas"]
  F --> G["Ir ao ponto físico"]
  G --> H["Ler NFC ou QR"]
  H --> I["Página /t/:codigo"]
  I --> J["Enviar carimbo autenticado"]
  J --> K{"Servidor valida?"}
  K -->|Não| L["Retorna erro / motivo"]
  K -->|Sim| M["Grava carimbo em transação"]
  M --> N["Atualiza rota e coleção"]
  N --> O["Carta desbloqueada / progresso"]
  O --> P["Continuar explorando"]
```

### Validações do carimbo

1. Tag existe e ponto/rota estão publicados.
2. Chave do link `?k=` confere com o segredo configurado.
3. Geofence é avaliada apenas se o ponto/ambiente exigir localização.
4. Limite de ritmo é recalculado sob lock da conta, dentro da transação.
5. Repetição dentro da janela definida não cria um novo carimbo-base.
6. Deslocamento improvável e ritmo suspeito são sinalizados para revisão; a sinalização não equivale a prova de fraude.
7. Resultado inclui informações da rota, coleção/carta, contagem diária e, quando aplicável, dados de evento.

**Limite importante:** uma tag NFC comum ou QR estático pode ser fotografado/copiar o link. Chave assinada dificulta adivinhação e permite revogação, mas não prova por si só que a pessoa esteve fisicamente no local.

## 2. Cadastro, login e sessão

```mermaid
sequenceDiagram
  participant U as Pessoa
  participant C as PWA
  participant A as API Express
  participant D as MySQL
  U->>C: Envia cadastro/login
  C->>A: HTTPS · endpoint de conta
  A->>A: Valida entrada e limites
  A->>D: Consulta/cria conta e sessão
  D-->>A: Resultado
  A-->>C: Cookie de sessão HttpOnly
  C-->>U: Área autenticada
```

- Senhas são derivadas com scrypt conforme a documentação.
- A sessão é baseada em cookie HttpOnly; atributos incluem SameSite e Secure em HTTPS.
- Operações que alteram dados devem respeitar verificação de origem e autorização.
- A recuperação usa token de uso único, com expiração curta, e envio pelo Resend quando configurado.
- Não registrar senha, token de redefinição, cookie ou hash sensível em logs.

## 3. Recuperação de senha

```mermaid
sequenceDiagram
  participant U as Pessoa
  participant P as PWA
  participant API as API
  participant DB as MySQL
  participant R as Resend
  U->>P: Solicita recuperação
  P->>API: POST pedido de recuperação
  API->>DB: Registra token temporário
  API->>R: Solicita envio do e-mail
  R-->>U: Link de redefinição
  U->>P: Abre link
  P->>API: Envia token + nova senha
  API->>DB: Valida token, prazo e uso único
  API->>DB: Atualiza credencial e invalida token
  API-->>P: Confirmação
```

Dependências: `RESEND_API_KEY`, `RESEND_FROM`, `APP_PUBLIC_URL` e domínio verificado. Sem as variáveis válidas, não considerar a recuperação pronta em produção.

## 4. Eventos e patrocínios

```mermaid
flowchart TD
  ADMIN["Admin cria evento / patrocínio"] --> CONFIG["Define janela, status e pontos vinculados"]
  CONFIG --> PUBLICA["Publica evento"]
  P["Participante autenticado"] --> TAG["Lê tag de ponto incluído"]
  TAG --> API["POST /api/eventos/:slug/carimbar"]
  API --> JANELA{"Evento ao vivo?"}
  JANELA -->|Não| ERRO["Recusa fora da janela"]
  JANELA -->|Sim| VINCULO{"Tag vinculada ao evento?"}
  VINCULO -->|Não| ERRO
  VINCULO -->|Sim| REGISTRA["Grava carimbo de evento"]
  REGISTRA --> EDICAO["Emite número de edição"]
  REGISTRA --> ROTA["Garante visita-base da rota"]
```

## 5. Administração e publicação de pontos

```mermaid
flowchart TD
  A["Admin autenticado"] --> B["Criar/editar rota e ponto"]
  B --> C["Ponto fica pendente"]
  C --> D["Cadastrar responsável e autorização"]
  D --> E["Registrar vistoria"]
  E --> F["Publicar ponto"]
  F --> G["Ativar/gerar chave da tag"]
  G --> H["Exportar link seguro / gravar NFC ou QR"]
  H --> I["Testar leitura em campo"]
```

A publicação deve exigir responsável, autorização e vistoria conforme `EXIGIR_AUTORIZACAO` (padrão true). Não publicar ponto sem permissão documentada e validação presencial das coordenadas.

## 6. Fotos e cartas

```mermaid
flowchart TD
  ADMIN["Admin → Fotos"] --> UP["Enviar foto"]
  UP --> ORIG["Preservar original"]
  ORIG --> PROC["Gerar cópias otimizadas / remover EXIF"]
  PROC --> REV["Revisar / aprovar"]
  REV --> SELECT["Usar na carta"]
  SELECT --> CARD["Imagem principal da carta"]
  CARD --> PWA["Exibição na coleção"]
  ARCH["Arquivar / excluir foto"] --> CARD
  ARCH -->|Sai da seleção ativa| PWA
```

O original e os derivados têm papéis diferentes. A aprovação, o crédito, a autorização de uso e a política de exclusão devem seguir [midia.md](midia.md). A visualização ampliada e a miniatura também devem respeitar as regras de desbloqueio descritas no produto.

## 7. Exclusão de conta

O fluxo autenticado `DELETE /api/eu` remove os carimbos do usuário, sessões, conta associada e registro de usuário em transação, conforme o código atual. O usuário também dispõe da página pública `/excluir-conta` para instruções e contato. A operação deve ser testada com conta de teste antes de liberar produção.

## 8. Endpoints de referência

| Endpoint | Método | Finalidade |
|---|---|---|
| `/api/saude` | GET | Saúde do servidor e consulta ao banco |
| `/api/catalogo` | GET | Catálogo público |
| `/api/caderneta` | GET | Progresso, rotas, eventos e coleção do usuário |
| `/api/tags/:codigo/carimbar` | POST | Registrar carimbo de ponto |
| `/api/eventos/:slug/carimbar` | POST | Registrar carimbo de evento |
| `/api/gamificacao` | prefixo | Recursos de gamificação |
| `/api/admin` | prefixo | Recursos administrativos autenticados |
| `/api/eu` | DELETE | Excluir dados/conta do usuário autenticado |

A especificação OpenAPI em [docs/api/](api/README.md) é a referência contratual quando houver divergência.

## 9. Testes de ponta a ponta recomendados

- Cadastro → sair → login com mesma conta.
- Login em segundo aparelho e persistência correta da sessão.
- Tag publicada: leitura válida, chave inválida, tag despublicada e geofence habilitada/desabilitada.
- Duplo toque na mesma tag dentro e fora da janela de repetição.
- Tentativas simultâneas e limite de ritmo.
- Evento antes, durante e depois da janela; tag vinculada e não vinculada.
- Carta desbloqueada, foto aprovada, foto arquivada e acesso por usuário sem desbloqueio.
- Recuperação de senha: token expirado, usado, inválido e link aberto em outro aparelho.
- Exclusão de conta e conferência da remoção dos dados relacionados.
- Restauração de backup em banco isolado.

Os testes unitários existentes não substituem esta bateria E2E completa.
