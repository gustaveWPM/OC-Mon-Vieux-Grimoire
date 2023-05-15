import { Request } from 'express';

export interface IExtendedReq extends Request {
  auth: {
    userId: string;
  };
}
