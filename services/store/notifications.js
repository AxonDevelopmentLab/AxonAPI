const accountScheme = require("../../database/account");
const paymentsScheme = require("../../database/payments");

const DiscountService = require('./discount.js');

const mercadopago = require('mercadopago');
const crypto = require('crypto')
const axios = require('axios');

const client = new mercadopago.MercadoPagoConfig({ accessToken: process.env.MercadoPagoToken });

exports.load = async (IP, Req, Res) => {
  const notification = Req.body;
  
  let paymentId;
  if (notification.type && notification.type === "payment") paymentId = notification.data.id;
  const payment = new mercadopago.Payment(client);
  payment.get({ id: paymentId }).then(async (response) => {
    if (response.date_approved !== null) {
      const getPayment = await paymentsScheme.findOne({ TransactionID: paymentId });
      if (!getPayment) return;
      
      const getAccount = await accountScheme.findOne({ ID: getPayment.AccountID });
      
      let ExpiresIn = Math.round(Date.now() / 1000);
      if (Number(getAccount.Plan.ExpiresIn) > 0) ExpiresIn = Number(getAccount.Plan.ExpiresIn);
      ExpiresIn = ExpiresIn + (60 * 60 * 24 * 30 * Number(getPayment.Duration));
      
      if (getPayment.CupomCode !== '') DiscountService.sumCupomUse(getPayment.CupomCode);
      await accountScheme.findOneAndUpdate({ ID: getPayment.AccountID }, { 'Plan': { Current: getPayment.RawName, ExpiresIn: ExpiresIn }});
      await paymentsScheme.findOneAndUpdate({ TransactionID: paymentId }, { Approved: true });

      const message = {
        embeds: [{
          title: '💳 **Checkout Pago**',
          description: `**Plano Selecionado:** ${getPayment.DisplayName}\n**Subtotal:** R$ ${getPayment.Subtotal}\n\n**Email:** ${getAccount.Email.Current}\n**ID de Transação:** ${paymentId}\n**ID do Processo:** ${getPayment.ProcessID}\n**ID da Conta:** ${getAccount.ID}`,
          color: 0x42ad2a
        }]
      };

      axios.post(process.env.DiscordCheckoutChannel, message);
    };
  }).catch((err) => {
    undefined;
  })

  Res.sendStatus(200);
}