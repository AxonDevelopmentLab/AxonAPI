const DiscountsScheme = require("../../database/discounts");

async function getCupom(CupomCode) {
  const searchCupom = await DiscountsScheme.findOne({ Code: CupomCode });
  if (!searchCupom) return false;
  
  if (searchCupom.isActive === false) return false;
  if (Number(searchCupom.MaxTimes) !== -1 && Number(searchCupom.TimesUsed) === Number(searchCupom.MaxTimes)) return false;
  return Number(searchCupom.Percentage);
}

exports.sumCupomUse = async (CupomCode) => {
  const searchCupom = await DiscountsScheme.findOne({ Code: CupomCode });
  if (!searchCupom) return false;
  
  const actuallyCupomUsedTimes = Number(searchCupom.TimesUsed);
  await DiscountsScheme.findOneAndUpdate({ Code: CupomCode }, { TimesUsed: (actuallyCupomUsedTimes + 1) });
}

exports.isValidToken = async (Token) => {
  const findCupom = await getCupom(Token);
  if (findCupom === false) return { status: false };
  return { status: true, discount: findCupom };
}

exports.load = async (IP, Req, Res) => {
  const BODY = Req.body;
  if (!BODY.discount) return Res.send({ status: 400 });
  
  const findCupom = await getCupom(BODY.discount);
  if (findCupom === false) return Res.send({ status: 400 });
  return Res.send({ status: 200, discount: findCupom });
}