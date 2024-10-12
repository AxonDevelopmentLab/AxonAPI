const nodemailer = require('nodemailer');

const EmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'contact.axonlab@gmail.com',
    pass: process.env.GoogleAuth
  }
});

exports.sendVerificationEmail = (DB, AccountID, Token, HTTP) => {
  const VERIFICATION_LINK = `https://axonhub.glitch.me/account/verify?id=${AccountID}&token=${Token}`;
  this.sendEmail(DB.Email.Current, {
    title: 'AxonHub | Verifique a sua conta.',
    subject: `Olá <b>${DB.Username.Current}</b>,<br>Você criou com sucesso a sua conta na AxonHub!<br><br>Para desbloquear o acesso da sua conta, verifique-a pelo link abaixo.<br>Clique <a href="${VERIFICATION_LINK}"><b>aqui</b></a> para verificar, ou acesse o link bruto logo abaixo.<br><br><a href="${VERIFICATION_LINK}"><b>${VERIFICATION_LINK}</b></a><br><br>Esse link é valido por apenas <b>duas horas</b>.<br>Após esse prazo, a sua conta será deletada caso não for verificada.<br><br>NÃO RESPONDA ESSE E-MAIL,<br>EM CASO DE AJUDA, ENTRE EM CONTATO VIA "axonhub@proton.me"<br><br>Atenciosamente,<br>AxonHub.`
  }).catch((error) => {
    return HTTP.send({ status: 400, message: 'Ocorreu um erro ao enviar o e-mail.' })
  })
}

exports.sendEmail = (Destinatario, Content) => {
  return new Promise((resolve, reject) => {
    const Options = {
      from: 'contact.axonlab@gmail.com',
      to: Destinatario,
      subject: Content.title,
      html: Content.subject
    };
  
    EmailTransporter.sendMail(Options, function(error, info){
      if (error) return reject();
      return resolve();
    });
  });
};