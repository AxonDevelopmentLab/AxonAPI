const validator = require('validator');
const axios = require('axios');

const Categories = {
  '1': 'Adquirir o AxonPlus.',
  '2': 'Políticas de Reembolso',
  '3': 'Dúvidas Gerais',
  '4': 'Solicitar exclusão dos meus dados.',
  '5': 'Solicitar os meus dados',
  '6': 'Conta bloqueada por atividade suspeita.'
}

exports.load = (IP, Req, Res) => {
  const BODY = Req.body;
  
  BODY.contact.name = validator.escape(BODY.contact.name);
  BODY.contact.email = validator.escape(BODY.contact.email);
  BODY.ticket.title = validator.escape(BODY.ticket.title);
  BODY.ticket.content = validator.escape(BODY.ticket.content);
  
  if ((BODY.contact.name).replaceAll(" ", "").length < 3) return Res.send({ status: 400, message: 'O nome necessita conter no mínimo 3 caracteres.' });
  if (!validator.isEmail(BODY.contact.email)) return Res.send({ status: 400, message: 'Email inválido.' });
  
  const AcceptableCategories = Object.keys(Categories);
  if (!AcceptableCategories.includes(BODY.ticket.category)) return Res.send({ status: 400, message: 'Categória inválida.' });
  
  if ((BODY.ticket.title).replaceAll(" ", "").length < 3) return Res.send({ status: 400, message: 'O título necessita conter no mínimo 3 caracteres.' });
  if ((BODY.ticket.content).replaceAll(" ", "").length < 20) return Res.send({ status: 400, message: 'O conteúdo precisa possuir no mínimo 20 caracteres.' });
  if (BODY.ticket.content.length > 2500) return Res.send({ status: 400, message: 'O conteúdo no máximo pode possuir 2500 Caracteres.' });
  Res.send({ status: 200, message: 'O seu ticket foi enviado com sucesso!<br>Aguarde a resposta pelo e-mail de contato.'});

  const message = {
      content: '🔔 **NOVO TICKET** @everyone',
      embeds: [
          {
              title: BODY.ticket.title,
              description: `**Enviado por:**\n${BODY.contact.name} (${IP})\n\n**Email de Contato:**\n${BODY.contact.email}\n\n**Categoria do Ticket**\n${Categories[BODY.ticket.category]}\n\n**Conteúdo do Ticket**:\n${BODY.ticket.content}`,
              color: 0x352F44
          }
      ]
  };

  axios.post(process.env.DiscordTicketChannel, message)
}