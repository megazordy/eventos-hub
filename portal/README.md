# eventos-hub · portal

Portal web para organizações emitirem certificados de eventos: cadastro da organização (com aprovação),
cadastro do evento, editor de modelo (1 ou 2 folhas, com prévia ao vivo), upload de listas (CSV/Excel),
geração dos PDFs com código único + QR e página pública de verificação.
Também tem a tela **Contatos e WhatsApp**: filtra a lista (equipe, função, busca), exporta a lista filtrada em
Excel e monta um link do WhatsApp por pessoa com a mensagem personalizada (envio manual, um clique por conversa).

## Como funciona (e por que é seguro para a LGPD)

| Dado | Onde fica |
|---|---|
| Listas de pessoas, CPF, e-mails | Lidos **só no navegador**; nunca vão para o servidor do portal |
| PDFs e controle de códigos | **Google Drive do organizador** (`eventos-hub/<evento>/...`), escopo `drive.file` |
| Organização, evento, modelos | Firestore (sem dados pessoais de participantes) |
| Verificação | Firestore guarda só registros **cifrados** (AES-GCM, chave derivada do código por PBKDF2). Leitura um a um pelo id; listar é proibido pelas regras |

O esquema de criptografia é o mesmo do gerador de linha de comando (`certificados/`), então certificados
emitidos pelos dois caminhos são verificáveis do mesmo jeito.

## Rodar localmente

```bash
cd portal
bun install
bun run dev        # http://localhost:5173
bun run test       # testes unitários (inclui compatibilidade com o CLI)
bun run test:rules # regras do Firestore no emulador (precisa de Java e da CLI do Firebase)
bun run build      # gera portal/dist
```

O emulador usa as portas 8095, 4495 e 4595 para não conflitar com outros projetos. No Windows ele às vezes
fica rodando depois dos testes; se a porta 8095 estiver ocupada, encerre o processo `java` dessa porta.
O GitHub Actions (`.github/workflows/ci.yml`) roda os testes, as regras e o build em cada PR.

Sem `.env.local`, o portal abre em **modo demonstração**: tudo fica no navegador e os PDFs são baixados em ZIP.

## Estrutura

- `src/lib/template.js` — motor de modelos (configuração → HTML da frente e do verso)
- `src/lib/presets.js` — modelo simples e modelos do Startup Weekend Itapema 2026
- `src/lib/pdf.js` — rasteriza as páginas e monta o PDF no navegador
- `src/lib/generate.js` — geração em lote (códigos, PDF, Drive, registros cifrados)
- `src/lib/lists.js` — leitura de CSV/XLSX, mapeamento de colunas e validação
- `src/lib/contacts.js` — filtro, telefone para WhatsApp, mensagem personalizada e exportação
- `src/lib/store.js` — dados (Firebase ou modo demonstração)
- `src/lib/gdrive.js` — Google Drive do organizador
- `firestore.rules` — regras de segurança
- `firebase.json` — Hosting (cabeçalhos de segurança) e Firestore

## Colocar no ar (Firebase) — feito uma vez

1. Criar o projeto em <https://console.firebase.google.com> e adicionar um **app Web**.
2. **Authentication** → Método de login → ativar **Google**. Em *Domínios autorizados*, incluir o domínio do Hosting.
3. **Firestore Database** → criar (modo produção, região `southamerica-east1`).
4. No **Google Cloud Console** do mesmo projeto: ativar a **Google Drive API**; na *Tela de consentimento OAuth*,
   adicionar o escopo `.../auth/drive.file`, nome do app, e-mail de suporte e logo.
5. Copiar `portal/.env.example` para `portal/.env.local` e preencher com a configuração do app Web
   (e `VITE_PUBLIC_URL`, ex.: `https://<projeto>.web.app/`).
6. Instalar a CLI e publicar:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add <id-do-projeto>
   bun run build && firebase deploy --only hosting,firestore
   ```
7. Tornar-se admin: entrar uma vez no portal, copiar seu UID (Authentication → Usuários) e criar no Firestore
   o documento `admins/<UID>` (pode ser vazio). A partir daí aparece o menu **Aprovações**.

## Segurança

- Regras do Firestore: organização só cria evento/registro após aprovação; cada uma só vê os próprios eventos;
  `salt` e iterações do evento não podem ser alterados depois de criados (senão os códigos emitidos quebrariam).
- Token do Drive fica só na aba (`sessionStorage`), expira em ~1h e nunca é gravado no Firestore.
- Cabeçalhos no Hosting: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` e CSP em modo
  *report-only* (passar para obrigatório depois de validar o login no domínio final).
