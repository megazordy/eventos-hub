# eventos-hub

Sistema aberto (MIT) para eventos: emissão de certificados em PDF com código único + QR e página pública de verificação. Primeiro evento: techstars_ Startup Weekend Itapema - Turistech 2026.

## Portal (web)
O portal em `portal/` permite que organizações aprovadas cadastrem eventos, editem modelos (1 ou 2 folhas), subam listas e gerem certificados direto no navegador, salvando os PDFs no próprio Google Drive. Veja [portal/README.md](portal/README.md).

## Estrutura
- `certificados/` — módulo de certificados (`generate.js`, `lib/`, `apps-script/Code.gs`)
- `eventos/<id>/` — um evento: `event.json` (nome, datas, carga horária, cores, assinaturas, Drive), `templates/*.html` (modelos editáveis), `assets/`
- `portal/` — portal web (Firebase): eventos, modelos, listas e geração no navegador
- `docs/` — página de verificação (GitHub Pages). Só dados cifrados.
- `input/`, `output/` — listas e PDFs locais. **Fora do Git.**

## Uso
```bash
bun install
node certificados/generate.js --event tsw-itapema-2026 --type participante --list input/participantes.csv
```
Tipos: `participante`, `mentor`, `organizacao`, `facilitador`, `patrocinador`, `apoiador`. CSV com colunas `nome, equipe/startup, função, e-mail, cpf` (`,` ou `;`). Patrocinador e apoiador aceitam `cnpj` (ou `cnpj/cpf`); patrocinador exige `cota` (Mirante do Encanto, Ponte dos Suspiros ou Meia Praia).
Opções: `--draft` (prévia), `--no-upload` (sem Drive), `--only-index` (só reconstrói `docs/data`).
Depois de cada lote: commit de `docs/` para publicar a verificação.

## Drive
Instale `certificados/apps-script/Code.gs` na conta da organização (instruções no topo do arquivo) e crie `drive.local.json` na raiz: `{ "url": "<URL /exec>", "token": "<TOKEN>" }` (ignorado pelo Git).

## Novo evento
1. Copie `eventos/tsw-itapema-2026` para `eventos/<novo-id>`.
2. Edite `event.json` (troque `codePrefix` e `salt`!) e os modelos em `templates/`.
3. Campos dos modelos: `{{person.name}}`, `{{person.team}}`, `{{person.role}}`, `{{code}}`, `{{{qrSvg}}}`, `{{verifyHost}}`, `{{person.cpf}}`, `{{person.cnpj}}`, `{{person.tier}}`, `{{sig1.name}}`, `{{sig1.role}}`, `{{sig1.image}}`, `{{sig2.*}}`, `{{event.*}}`, `{{{cssVars}}}`; bloco condicional `{{#campo}}...{{/campo}}`.

## Privacidade
Cada registro público é cifrado (AES-GCM) com chave derivada do código (PBKDF2). Sem o código, nada é legível. PDFs, listas e planilha de códigos nunca vão para o repositório.
