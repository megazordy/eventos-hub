import React from 'react';

// Política de privacidade e termos de uso (LGPD, Lei 13.709/2018).
// Texto base: revisar com a organização responsável antes de publicar (veja README).
export function Privacy() {
  return (
    <main className="wrap" style={{ maxWidth: 820 }}>
      <h1>Política de privacidade</h1>
      <div className="card stack">
        <p><b>Quem trata os dados.</b> Cada organização que emite certificados pelo eventos-hub é a <b>controladora</b> dos dados dos seus participantes. O eventos-hub é uma ferramenta: processa os dados no navegador do organizador e guarda apenas o mínimo necessário para a verificação.</p>
        <p><b>O que fica onde.</b></p>
        <ul>
          <li><b>Listas de pessoas (nome, e-mail, CPF etc.):</b> lidas somente no navegador do organizador. Não são enviadas aos servidores do eventos-hub.</li>
          <li><b>Certificados em PDF e controle de códigos:</b> salvos no Google Drive do próprio organizador. O CPF aparece no PDF de forma parcialmente oculta; o controle de códigos não guarda CPF.</li>
          <li><b>Servidor do eventos-hub (Google Firebase):</b> dados da organização (nome e contato), dados do evento, modelos de certificado e registros de verificação <b>cifrados</b>, que só podem ser lidos com o código de cada certificado.</li>
          <li><b>Login:</b> conta Google do organizador (nome, e-mail e identificador), usada para acesso e para salvar arquivos no Drive dele.</li>
        </ul>
        <p><b>Finalidade e base legal.</b> Emitir e comprovar a autenticidade de certificados de participação em eventos (execução de contrato e legítimo interesse, art. 7º, V e IX da LGPD).</p>
        <p><b>Verificação pública.</b> Quem informa o código de um certificado vê nome, tipo de participação, equipe (quando houver), dados do evento e o link do PDF. Sem o código, nenhum dado é exibido nem pode ser listado.</p>
        <p><b>Seus direitos.</b> Participantes podem pedir acesso, correção ou remoção dos seus dados à organização responsável pelo evento, cujo contato aparece na página de verificação. Organizadores podem excluir seus eventos a qualquer momento.</p>
        <p><b>Retenção.</b> Os registros de verificação ficam disponíveis enquanto a organização mantiver o evento, para que os certificados continuem verificáveis. A exclusão de um certificado pode ser pedida à organização.</p>
        <p><b>Segurança.</b> Comunicação criptografada (HTTPS), regras de acesso por organização, registros cifrados (AES-GCM com chave derivada do código por PBKDF2) e acesso ao Drive restrito aos arquivos criados pelo próprio portal.</p>
      </div>
      <a className="btn secondary" href="#/">Voltar</a>
    </main>
  );
}

export function Terms() {
  return (
    <main className="wrap" style={{ maxWidth: 820 }}>
      <h1>Termos de uso</h1>
      <div className="card stack">
        <p>Ao cadastrar uma organização no eventos-hub, você declara que:</p>
        <ul>
          <li>representa a organização cadastrada e tem autorização para emitir certificados em nome dela e dos eventos que cadastrar;</li>
          <li>usará nomes, marcas e logos de eventos, patrocinadores e parceiros apenas com autorização dos titulares;</li>
          <li>emitirá certificados apenas para pessoas que de fato participaram, com dados verdadeiros;</li>
          <li>tem base legal para tratar os dados pessoais das listas enviadas e responderá aos pedidos dos titulares (LGPD);</li>
          <li>informará os participantes de que o certificado contém nome e CPF parcialmente oculto e pode ser verificado por quem tiver o código.</li>
        </ul>
        <p>Organizações passam por aprovação antes de emitir certificados. O eventos-hub pode suspender organizações em caso de uso indevido, como certificados falsos.</p>
        <p>O eventos-hub é software livre (licença MIT), oferecido sem garantias. Contribuições são bem-vindas no repositório do projeto.</p>
      </div>
      <a className="btn secondary" href="#/">Voltar</a>
    </main>
  );
}
