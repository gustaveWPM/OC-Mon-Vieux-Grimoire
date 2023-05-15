import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt, { JwtPayload } from 'jsonwebtoken';
import AuthReq from '../interfaces/AuthReq';

interface AuthPayload extends JwtPayload {
  userId: string;
}

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decodedToken = jwt.verify(token!, process.env.TOKEN_SECRET!);
    const userId = (decodedToken as AuthPayload).userId;

    (req as AuthReq).auth = { userId };
    next();
  } catch (error) {
    res.status(StatusCodes.UNAUTHORIZED).json({ error });
  }
}

export default authMiddleware;