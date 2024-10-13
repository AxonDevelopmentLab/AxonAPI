const accountScheme = require("../../database/account");
const instalockScheme = require("../../database/instalockapp");

const servicesAccess = require("../../database/serviceAccess");

const LatestObjectsVersions = {
  'InstalockAPP': ['1.0.0']
};

const DefaultObjects = {
  InstalockAPP: {
    '1.0.0': {
      v: '1.0.0',
      ID: 'AccountID',
      Picks: 10,
      Statistics: {
        Agents: [],
        Matches: {
          Total: 0,
          Sucessfully: 0
        }
      } 
    }
  }
}

exports.validateUpdateCreate = (AccountID, ServiceName) => {
  const services = {
    'instalockapp': async () => {
      const getService = await instalockScheme.findOne({ ID: AccountID });
      if (getService) {
        if (getService.v !== LatestObjectsVersions.InstalockAPP[0]) {
          const NewestV = DefaultObjects.InstalockAPP[LatestObjectsVersions.InstalockAPP[0]];
          const CurrentV = DefaultObjects.InstalockAPP[getService.v];
          //objeto desatualizado, precisa atualizar, utiliza com base os dois objetos a cima pra atualizar
        }
      } else {
        let getLatestObjectVersion = DefaultObjects.InstalockAPP[LatestObjectsVersions.InstalockAPP[0]];
        getLatestObjectVersion.ID = AccountID;
        
        const createDatabase = new instalockScheme(getLatestObjectVersion);
        createDatabase.save();
      }
    }
  };
  
  return services[ServiceName]();
}

exports.getService = (AccountID, ServiceName) => {
  const services = {
    'instalockapp': async () => {
      const getService = await instalockScheme.findOne({ ID: AccountID });
      if (!getService) return false;
      return getService;
    }
  };
  
  return services[ServiceName]();
}

exports.getAccess = async (AccountID, ServiceName) => {
  const getAccount = await accountScheme.findOne({ ID: AccountID });
  const accountPlan = getAccount.Plan.Current;
  
  const getService = await servicesAccess.findOne({ ServiceName: ServiceName });
  if (!getService.AccessLimited.includes(accountPlan)) return { status: 400 };
  
  let recreateObject = JSON.parse(JSON.stringify(getService));
  delete recreateObject.ServiceName;
  delete recreateObject.AccessLimited;
  delete recreateObject.AppHash;
  delete recreateObject._id;
  delete recreateObject.__v;
  
  return recreateObject;
}