import { Request } from 'express';

export interface AuthReq extends Request {
  auth: {
    userId: string;
  };
}

export default AuthReq;
