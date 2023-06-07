import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import ServerConfig from '../../../config/ServerConfig';
import { printError } from '../../lib/debugger';
import errorToObj from '../../lib/errorToObj';
import { processPasswordHashing } from '../../services/critical/UserAuth';

namespace Config {
  export const FAILED_TO_HASH_PASSWORD_ERROR: string = ServerConfig.UNKNOWN_ERROR;
}

export async function hashPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { password: givenPassword } = req.body;
    const hashedPassword = await processPasswordHashing(givenPassword);

    if (!hashedPassword) {
      throw new Error(Config.FAILED_TO_HASH_PASSWORD_ERROR);
    }
    req.body.password = hashedPassword;
    next();
  } catch (error) {
    printError(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorToObj(error));
  }
}

export default hashPassword;
