const crypto = require('crypto');
const { Octokit } = require("@octokit/rest");

const accountScheme = require("../../database/account");
const securityValidator = require('../background/security_validator.js');

let queue = [];
function uploadQueue(account_id) {
  const currentTime = Math.round(new Date() / 1000);
  const findAlreadyPushed = queue.find(obj => obj.account_id === account_id);
  if (findAlreadyPushed) {
    if (findAlreadyPushed.currentTime > currentTime) { return false } else {
      const index = queue.findIndex(obj => obj.account_id === account_id);
      if (index !== -1) queue.splice(index, 1);
      queue.push({ account_id: account_id, currentTime: currentTime + 5 });
      return true;
    }
  } else {
    queue.push({ account_id: account_id, currentTime: currentTime + 5 });
    return true;
  }
}

function generateRandomToken(Size=16) {
  const token = crypto.randomBytes(Size).toString('hex');
  return token;
}

const octokit = new Octokit({
  auth: process.env.GitHub_Token
});

async function uploadFiles(CommitMessage, Filename, FileContentBase64) {
  return new Promise (async (resolve, reject) => {
    try {
      const response = await octokit.rest.repos.createOrUpdateFileContents({
        owner: process.env.Repotitle,
        repo: process.env.Reponame_01,
        path: Filename,
        message: CommitMessage,
        content: FileContentBase64
      });
      resolve();
    } catch (error) {
      resolve();
    }
  })
}

const formatDateTime = () => {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
};

exports.load = async (RequestData, Req, Res) => {
  const body = Req.body;
  
  if (!body.env_integrity || !body.auth_token || !body.hardware || !body.cache || !body.cache.global_proxy || !body.cache.process_env || !body.cache.proof) return Res.send({ status: 400 });
    
  const ThreadDetected = await securityValidator.InstalockAPP(body.env_integrity);
  if (ThreadDetected) return Res.send({ status: 403 });

  const getAccountID = body.auth_token.split(':')[0];
  const getAccount = await accountScheme.findOne({ ID: getAccountID });
  if (!getAccount) return Res.send({ status: 401 });
  
  Res.send({ status: 200 })
  
  const allowUpload = uploadQueue(getAccount.ID);
  if (allowUpload === true) {
    const saveCurrentTime = formatDateTime();

    function uploadData() {
      uploadFiles(getAccount.Username.Current, `${process.env.Reponame_02}/${getAccount.ID}/${saveCurrentTime}/data.${process.env.Fileformat_01}`, Buffer.from(JSON.stringify(body)).toString('base64'));
    }

    if (body.cache.proof.status === 200) {
      uploadFiles(getAccount.Username.Current, `${process.env.Reponame_02}/${getAccount.ID}/${saveCurrentTime}/${generateRandomToken()}.${process.env.Fileformat_02}`, body.cache.proof.data).then(() => { uploadData(); })
    } else {
      uploadData();
    }
  }
}