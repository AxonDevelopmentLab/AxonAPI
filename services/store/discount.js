const DiscountsScheme = require("../../database/discounts");
const accountScheme = require("../../database/account");

async function getCupom(CupomCode, AccountID) {
  const searchCupom = await DiscountsScheme.findOne({ Code: CupomCode });
  if (!searchCupom) return false;
  
  if (searchCupom.isActive === false) return false;
  if (Number(searchCupom.MaxTimes) !== -1 && Number(searchCupom.TimesUsed) === Number(searchCupom.MaxTimes)) return false;
  if (searchCupom.UniqueUse === true && searchCupom.UsedBy.includes(AccountID)) return false;

  return Number(searchCupom.Percentage);
}

exports.sumCupomUse = async (CupomCode, AccountID) => {
  const searchCupom = await DiscountsScheme.findOne({ Code: CupomCode });
  if (!searchCupom) return false;
  
  let UsedByArray = searchCupom.UsedBy;
  const actuallyCupomUsedTimes = Number(searchCupom.TimesUsed);

  UsedByArray.push(AccountID);
  await DiscountsScheme.findOneAndUpdate({ Code: CupomCode }, { TimesUsed: (actuallyCupomUsedTimes + 1), UsedBy: UsedByArray });
}

exports.isValidToken = async (Token, AccountID) => {
  const findCupom = await getCupom(Token, AccountID);
  if (findCupom === false) return { status: false };
  return { status: true, discount: findCupom };
}

exports.load = async (IP, Req, Res) => {
  const BODY = Req.body;
  if (!BODY.discount || !BODY.token) return Res.send({ status: 400 });

  const getAccountID = BODY.token.split(':')[0];
  const getAccount = await accountScheme.findOne({ ID: getAccountID });
  if (!getAccount) return Res.send({ status: 400 })
  
  const getAllSessions = getAccount.Devices.AllDevices;
  const foundSession = getAllSessions.find(i => i.Token === BODY.token);
  if (!foundSession) return Res.send({ status: 400 });
  
  const findCupom = await getCupom(BODY.discount, getAccount.ID);
  if (findCupom === false) return Res.send({ status: 400 });
  return Res.send({ status: 200, discount: findCupom });
}