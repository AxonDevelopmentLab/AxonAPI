const accountScheme = require("../../../database/account");
const securityValidator = require('../../background/security_validator.js');
const servicesSys = require('../../accountmanager/services.js');
const instalockScheme = require("../../../database/instalockapp");

exports.load = async (RequestData, Req, Res) => {
  const BODY = Req.body;
  
  if (!BODY.token || !BODY.function || !['sum_agents', 'sum_matches'].includes(BODY.function) || !BODY.security) return Res.send({ status: 400 });
  
  const getAccountID = BODY.token.split(':')[0];
  const getAccount = await accountScheme.findOne({ ID: getAccountID });
  if (!getAccount) return Res.send({ status: 401 })
  
  const getAllSessions = getAccount.Devices.AllDevices;
  const foundSession = getAllSessions.find(i => i.Token === BODY.token);
  if (!foundSession) return Res.send({ status: 401 });
  
  const ThreadDetected = await securityValidator.InstalockAPP(BODY.security);
  if (ThreadDetected) return Res.send({ status: 403 });
  
  const services = {
    'sum_agents': async () => {
      const AgentName = BODY.agent_name;
      if (!AgentName) return Res.send({ status: 400 });
      
      let getStatistics = await servicesSys.getService(getAccount.ID, 'instalockapp');
      if (getStatistics === false) return Res.send({ status: 401 });
      
      const findAgent = getStatistics.Statistics.Agents.find(callback => callback.name === AgentName);
      if (findAgent) { findAgent.times++ } else { getStatistics.Statistics.Agents.push({ name: AgentName, times: 1 })};
      getStatistics.Statistics.Matches.Sucessfully++;
      
      await instalockScheme.findOneAndUpdate({ ID: getAccountID }, {
        'Statistics.Matches.Sucessfully': Number(getStatistics.Statistics.Matches.Sucessfully),
        'Statistics.Agents': getStatistics.Statistics.Agents
      });
      
      let recreateStatistics = JSON.parse(JSON.stringify(getStatistics));
      recreateStatistics.allowPicks = true;
      if (Number(getStatistics.Picks) === 0 && getAccount.Plan.Current === 'free') recreateStatistics.allowPicks = false

      delete recreateStatistics.v;
      delete recreateStatistics.__v;
      delete recreateStatistics._id;
      delete recreateStatistics.ID;
      
      return Res.send({ status: 403, statistics: recreateStatistics });
    },
    'sum_matches': async () => {
      let getStatistics = await servicesSys.getService(getAccount.ID, 'instalockapp');
      if (getStatistics === false) return Res.send({ status: 401 });

      if (getAccount.Plan.Current === 'free') {
        if (Number(getStatistics.Picks) === 0) return Res.send({ status: 401 });
        getStatistics.Picks = Number(getStatistics.Picks) - 1;
      }
      
      getStatistics.Statistics.Matches.Total++;
      
      await instalockScheme.findOneAndUpdate({ ID: getAccountID }, {
        'Picks': getStatistics.Picks,
        'Statistics.Matches.Total': Number(getStatistics.Statistics.Matches.Total)
      });

      let recreateStatistics = JSON.parse(JSON.stringify(getStatistics));
      recreateStatistics.allowPicks = true;
      if (Number(getStatistics.Picks) === 0 && getAccount.Plan.Current === 'free') recreateStatistics.allowPicks = false
      
      delete recreateStatistics.v;
      delete recreateStatistics.__v;
      delete recreateStatistics._id;
      delete recreateStatistics.ID;
      
      return Res.send({ status: 403, statistics: recreateStatistics });
    }
  };
  
  try {
    return services[BODY.function]()
  } catch (err) {
    return Res.send({ status: 503 });
  }
}