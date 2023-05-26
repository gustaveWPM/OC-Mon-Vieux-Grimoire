import zxcvbn, { ZXCVBNResult } from 'zxcvbn';

export function getPasswordAudit(password: string): ZXCVBNResult {
  const passwordAudit = zxcvbn(password);
  return passwordAudit;
}

export default getPasswordAudit;
