import zxcvbn, { ZXCVBNResult } from 'zxcvbn';

export function getPasswordAudit(password: string): ZXCVBNResult {
  const passwordStrength = zxcvbn(password);
  return passwordStrength;
}

export default getPasswordAudit;
