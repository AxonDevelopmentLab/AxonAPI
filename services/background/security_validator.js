const crypto = require('crypto');
const blacklistScheme = require("../../database/blacklist");

exports.InstalockAPP = async (data) => {
  const getSecurityObject = JSON.parse((process.env.ElectronValidation_InstalockAPP).replaceAll('!', '"'));
  if (data.processid && data.processid === getSecurityObject.b) return false;
  
  const devicesHash = crypto.createHash('sha256').update(JSON.stringify(data.hwid)).digest('hex');
  const findDeviceBlocked = await blacklistScheme.findOne({ 'DevicesHash': devicesHash });
  if (findDeviceBlocked) return true;

  try {
    let threadDetected = false;
    
    const splitProcess = data.process.split('\\');
    const getXProcess = splitProcess[splitProcess.length - getSecurityObject.xl];
    if (getXProcess !== getSecurityObject.v) threadDetected = true;
    
    const splitFilename = data.filename.split('\\');
    const getX1Filename = splitFilename[splitFilename.length - getSecurityObject.d1];
    const getX2Filename = splitFilename[splitFilename.length - getSecurityObject.u6];
    
    if (getX1Filename !== getSecurityObject.k) threadDetected = true;
    if (getX2Filename !== getSecurityObject.f) threadDetected = true;
    
    const getMains = data.main.split('\\');
    const getX1Main = getMains[getSecurityObject.ll];
    const getX2Main = getMains[getMains.length - getSecurityObject.ch];
    const getX3Main = getMains[getMains.length - getSecurityObject.oa];
    const getX4Main = getMains[getMains.length - getSecurityObject.b9];
    
    if (getX1Main === getSecurityObject.pk) threadDetected = true;
    if (getX2Main !== getSecurityObject.m_) threadDetected = true;
    if (getX3Main !== getSecurityObject.k9) threadDetected = true;
    if (getX4Main !== getSecurityObject.x1) threadDetected = true;

    return threadDetected;
  } catch (err) {
    return true;
  }
}