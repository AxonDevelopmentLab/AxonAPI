//Schemes
const accountScheme = require("../../database/account");
const paymentsScheme = require("../../database/payments");

async function load() {
  const CurrentDate = Math.round(Date.now() / 1000);
  require("../../database/account").find({}).then(async Array => {
    const NonVerifiedAccounts = Array.filter(item => CurrentDate > (Number(item.CreatedAt) + (60 * 60 * 2)) && item.Email.Verified.Status !== true && item.Email.Previous.length === 0).map(DB => DB.ID);
    const ExpiredPlan = Array.filter(item => CurrentDate > Number(item.Plan.ExpiresIn) && item.Plan.Current !== 'free' && Number(item.Plan.ExpiresIn) !== -1).map(DB => DB.ID);
    const AccountsToDelete = Array.filter(item => CurrentDate > Number(item.Status.toDelete) && Number(item.Status.toDelete) !== 0).map(DB => DB.ID);

    for (const ID of ExpiredPlan) await accountScheme.findOneAndUpdate({ ID: ID }, { 'Plan': { Current: 'free', ExpiresIn: 0 }});
    for (const ID of AccountsToDelete) await accountScheme.findOneAndDelete({ ID: ID });
    for (const ID of NonVerifiedAccounts) await accountScheme.findOneAndDelete({ ID: ID });
  });
  
  require("../../database/payments").find({}).then(async Array => {
    const ExpiredPayments = Array.filter(item => CurrentDate > (Number(item.CreatedDate) + (60 * 30))).map(DB => DB.ID);

    for (const ID of ExpiredPayments) await paymentsScheme.findOneAndDelete({ ID: ID });
  }) 
}

exports.start = () => {
  load();
  
  const crontask_interval = 120; //Minutos
  setInterval(() => load(), (crontask_interval * 60 * 1000));
}