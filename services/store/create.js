const accountScheme = require("../../database/account");
const paymentsScheme = require("../../database/payments");

const DiscountService = require('./discount.js');
const mercadopago = require('mercadopago');
const axios = require('axios')
const crypto = require('crypto')

const client = new mercadopago.MercadoPagoConfig({ accessToken: process.env.MercadoPagoToken, options: { timeout: 5000, idempotencyKey: crypto.randomBytes(8).toString('hex') } });

const PlansPrice = {
  'axonplus': {
    name: 'Axon Plus',
    rawname: 'plus',
    price: 14.99
  }
}

const acceptablePlans = Object.keys(PlansPrice);
const acceptableDurations = ['1', '3', '6', '9', '12'];
const acceptablePaymentMethods = ['PIX'];

exports.load = async (IP, Req, Res) => {
  const BODY = Req.body;
  
  if (!BODY.token || !BODY.plan || !BODY.duration || !BODY.payment_method) return Res.send({ status: 400, message: 'Acesso não permitido.' });
  
  const getAccountID = BODY.token.split(':')[0];
  const getAccount = await accountScheme.findOne({ ID: getAccountID });
  if (!getAccount) return Res.send({ status: 400, message: 'Acesso não permitido.' })
  
  const getAllSessions = getAccount.Devices.AllDevices;
  const foundSession = getAllSessions.find(i => i.Token === BODY.token);
  if (!foundSession) return Res.send({ status: 400, message: 'Acesso não permitido.' });
  
  if (!acceptablePlans.includes(BODY.plan)) return Res.send({ status: 400, message: 'Acesso não permitido.' });
  if (!acceptableDurations.includes(BODY.duration)) return Res.send({ status: 400, message: 'Acesso não permitido.' });
  if (!acceptablePaymentMethods.includes(BODY.payment_method)) return Res.send({ status: 400, message: 'Acesso não permitido.' });
  
  let DiscountApplies = 0;
  if (BODY.discount && BODY.discount !== '') {
    const getDiscount = await DiscountService.isValidToken(BODY.discount);
    if (getDiscount.status === true) DiscountApplies = getDiscount.discount; 
  }
  
  const getPlanName = PlansPrice[BODY.plan].name;
  const getPlanRawName = PlansPrice[BODY.plan].rawname;
  const getPlanPrice = PlansPrice[BODY.plan].price;
  const getPlanDuration = Number(BODY.duration);
  const getPlanPriceByDuration = (getPlanPrice * getPlanDuration).toFixed(2);
  const getRawSubtotal = (getPlanPriceByDuration / 100) * (100 - DiscountApplies);
  const Subtotal = getRawSubtotal.toFixed(2);

  try {
    const payment = new mercadopago.Payment(client);
    const ProcessID = crypto.randomBytes(16).toString('hex');
    
    const body = {
      transaction_amount: Number(Subtotal),
      description: `Você está adquirindo "${getPlanName}", por "${getPlanDuration}" Mês(es).`,
      payment_method_id: 'pix',
      payer: {
        email: getAccount.Email.Current
      },
      external_reference: ProcessID,
      notification_url: 'https://axon-api.glitch.me/store/checkout/notifications'
    };
    
    const requestOptions = {
      idempotencyKey: crypto.randomBytes(16).toString('hex'),
    };
    
    payment.create({ body, requestOptions }).then((data) => {
      const scheme = new paymentsScheme({
        TransactionID: data.id,
        ProcessID: ProcessID,
        AccountID: getAccount.ID,
        CreatedDate: Math.round(Date.now() / 1000),
        Approved: false,
        RawName: getPlanRawName,
        DisplayName: getPlanName,
        Duration: Number(BODY.duration),
        Subtotal: Number(Subtotal),
        CupomCode: BODY.discount || ''
      });
      
      scheme.save();
      Res.send({ status: 200, processid: ProcessID, payment: { code: data.point_of_interaction.transaction_data.qr_code, qrcode: data.point_of_interaction.transaction_data.qr_code_base64 }});
    
      const message = {
        embeds: [{
              title: '📋 **Checkout Aberto**',
              description: `**Email:** ${getAccount.Email.Current}\n**Subtotal:** R$ ${Number(Subtotal)}\n\n**ID de Transação:** ${data.id}\n**ID do Processo:** ${ProcessID}\n**ID da Conta:** ${getAccount.ID}\n\n**Plano Selecionado:** ${getPlanName}\n**Duração do Plano:** ${Number(BODY.duration)}`,
              color: 0xffd97a
        }]
      };

      axios.post(process.env.DiscordCheckoutChannel, message);
      return;
    }).catch((error) => {
      return Res.send({ status: 400, message: 'Ocorreu um erro ao gerar o QRCode.' });
    });
  } catch (error) {
    return Res.send({ status: 400, message: 'Ocorreu um erro ao gerar o QRCode.' });
  }
}