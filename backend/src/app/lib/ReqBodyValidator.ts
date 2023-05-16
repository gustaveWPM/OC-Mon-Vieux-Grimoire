import { Request } from 'express';

export function isValidReqBody(req: Request, mantadoryFields: string[]) {
  for (const mandatoryField of mantadoryFields) {
    if (!(mandatoryField in req.body)) {
      return false;
    }
  }
  return true;
}

export default isValidReqBody;
