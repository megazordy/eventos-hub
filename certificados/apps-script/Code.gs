/**
 * eventos-hub · receptor de certificados no Google Drive da organização.
 *
 * Instalação (uma vez, logado na conta da organização):
 * 1. https://script.google.com → Novo projeto → cole este arquivo em Code.gs.
 * 2. Configurações do projeto → Propriedades do script → adicione TOKEN = <segredo longo e aleatório>.
 * 3. Implantar → Nova implantação → Tipo: App da Web
 *      Executar como: Eu (conta da organização) · Quem pode acessar: Qualquer pessoa
 * 4. Autorize, copie a URL do app da Web (termina em /exec) e configure no computador que gera os certificados.
 *
 * O que faz a cada chamada:
 * - cria (se faltar) a pasta folderPath a partir de "Meu Drive";
 * - salva o PDF (substitui um de mesmo nome), compartilha "qualquer pessoa com o link: leitor";
 * - grava/atualiza a linha do código na planilha de controle (privada, só a organização).
 */

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var expected = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!expected || body.token !== expected) return reply_({ ok: false, error: 'token inválido' });

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var folder = getOrCreatePath_(body.folderPath);
      var old = folder.getFilesByName(body.fileName);
      while (old.hasNext()) old.next().setTrashed(true);

      var blob = Utilities.newBlob(Utilities.base64Decode(body.contentBase64), 'application/pdf', body.fileName);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var url = 'https://drive.google.com/file/d/' + file.getId() + '/view';

      if (body.control) upsertControlRow_(body.control, body.row, url);
      return reply_({ ok: true, fileId: file.getId(), url: url });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return reply_({ ok: false, error: String(err && err.message || err) });
  }
}

function getOrCreatePath_(names) {
  var folder = DriveApp.getRootFolder();
  names.forEach(function (name) {
    var it = folder.getFoldersByName(name);
    folder = it.hasNext() ? it.next() : folder.createFolder(name);
  });
  return folder;
}

var HEADER_ = ['Código', 'Tipo', 'Nome', 'Equipe/Startup', 'Função', 'E-mail', 'Arquivo', 'Link do PDF', 'Atualizado em'];

function upsertControlRow_(control, row, url) {
  var folder = getOrCreatePath_(control.folderPath);
  var files = folder.getFilesByName(control.sheetName);
  var ss = files.hasNext()
    ? SpreadsheetApp.open(files.next())
    : moveTo_(SpreadsheetApp.create(control.sheetName), folder);
  var sheet = ss.getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADER_);

  var values = [row.code, row.type, row.name, row.team, row.role, row.email, row.fileName, url, new Date()];
  var codes = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues() : [];
  for (var i = 0; i < codes.length; i++) {
    if (codes[i][0] === row.code) {
      sheet.getRange(i + 2, 1, 1, values.length).setValues([values]);
      return;
    }
  }
  sheet.appendRow(values);
}

function moveTo_(ss, folder) {
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  return ss;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
