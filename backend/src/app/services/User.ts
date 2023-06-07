import { Request, Response } from 'express';
import StatusCodes from 'http-status-codes';
import jwt from 'jsonwebtoken';
import ServerConfig from '../../config/ServerConfig';
import { printError } from '../lib/debugger';
import { tryToFormatEmail } from '../lib/emailValidator';
import errorToObj from '../lib/errorToObj';
import reqBodyContainsMandatoryFieldsKeys from '../lib/reqBodyContainsMandatoryFieldsKeys';
import User, { UserDocument } from '../models/User';
import { TOKENS_EXPIRATION_DELAY, isValidPassword } from './critical/UserAuth';

namespace Config {
  export const REJECTED_USER_ERROR: string = 'Paire identifiant/mot de passe incorrecte';
  export const REJECTED_EMAIL_ERROR_GENERATOR = (givenEmail: string) =>
    `Adresse email invalide: "${givenEmail}" n'est pas une adresse email valide. Soit l'adresse email que vous avez entrée n'est pas une adresse email correcte, soit votre fournisseur d'adresse email est bloqué par notre système.`;
  export const FAILED_TO_RETRIEVE_TOKEN_SECRET_ERROR: string = ServerConfig.UNKNOWN_ERROR;
  export const TOKEN_SECRET = process.env.TOKEN_SECRET;
}

namespace Helpers {
  export const setRejectedUserResponse = (res: Response): Response =>
    res.status(StatusCodes.UNAUTHORIZED).json({ message: Config.REJECTED_USER_ERROR });

  export function throwIfInvalidReqBody(req: Request) {
    if (!reqBodyContainsMandatoryFieldsKeys(req, ['email', 'password'])) {
      throw new Error(Config.REJECTED_USER_ERROR);
    }
  }
}

namespace Incubator {
  export async function getUserFromEmail(inputEmail: string): Promise<UserDocument | undefined> {
    try {
      const email = tryToFormatEmail(inputEmail);
      const user = await User.findOne({ email });
      if (!user) {
        return undefined;
      }
      return user;
    } catch {
      return undefined;
    }
  }
}

export async function userLogin(req: Request, res: Response) {
  try {
    try {
      Helpers.throwIfInvalidReqBody(req);
    } catch {
      return Helpers.setRejectedUserResponse(res);
    }

    const user = await Incubator.getUserFromEmail(req.body.email);
    if (!user) {
      return Helpers.setRejectedUserResponse(res);
    }

    const validPassword = await isValidPassword(req.body.password, user.password);
    if (!validPassword) {
      return Helpers.setRejectedUserResponse(res);
    }

    const TOKEN_SECRET = Config.TOKEN_SECRET;
    if (!TOKEN_SECRET) {
      throw new Error(Config.FAILED_TO_RETRIEVE_TOKEN_SECRET_ERROR);
    }

    const token = jwt.sign({ userId: user._id }, TOKEN_SECRET, { expiresIn: TOKENS_EXPIRATION_DELAY });
    res.status(StatusCodes.OK).json({
      userId: user._id,
      token
    });
  } catch (error) {
    printError(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorToObj(error));
  }
}
