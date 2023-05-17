import { validate as emailValidator } from 'email-validator';
import { Request, Response } from 'express';
import StatusCodes from 'http-status-codes';
import jwt from 'jsonwebtoken';
import ServerConfig from '../../config/ServerConfig';
import { printError } from '../lib/debugger';
import errorToObj from '../lib/errorToObj';
import isValidReqBody from '../lib/isValidReqBody';
import User, { UserDocument } from '../models/User';
import { TOKENS_EXPIRATION_DELAY, isValidPassword, processPasswordHashing } from './critical/UserAuth';

namespace Config {
  export const MAX_MAIL_LEN: number = 40;
  export const MIN_PASSWORD_LEN: number = 8;
  export const MIN_PASSWORD_DIFFERENT_CHARS: number = 2;
  export const REJECTED_USER_ERROR: string = 'Paire identifiant/mot de passe incorrecte';
  export const TOO_SHORT_PASSWORD_ERROR: string = `Le mot de passe doit faire minimum ${MIN_PASSWORD_LEN} caractère${
    MIN_PASSWORD_LEN > 1 ? 's' : ''
  }, et doit contenir au minimum ${MIN_PASSWORD_DIFFERENT_CHARS} caractère${MIN_PASSWORD_DIFFERENT_CHARS > 1 ? 's' : ''} différents.`;
  export const FAILED_TO_HASH_PASSWORD_ERROR: string = ServerConfig.UNKNOWN_ERROR;
  export const FAILED_TO_RETRIEVE_TOKEN_SECRET_ERROR: string = ServerConfig.UNKNOWN_ERROR;
  export const TOKEN_SECRET = process.env.TOKEN_SECRET;
  export const MAIL_BLOCK_LIST: string[] = ['@yopmail.com'];
}

namespace Helpers {
  export const setRejectedUserResponse = (res: Response): Response =>
    res.status(StatusCodes.UNAUTHORIZED).json({ message: Config.REJECTED_USER_ERROR });

  export function isAuthorizedPassword(inputPassword: string) {
    if (inputPassword.length < Config.MIN_PASSWORD_LEN) {
      return false;
    }

    const uniqCharsSet = new Set(inputPassword);
    if (uniqCharsSet.size < Config.MIN_PASSWORD_DIFFERENT_CHARS) {
      return false;
    }

    return true;
  }

  export function isValidTrimmedAndLowercasedEmail(inputEmail: string, onEdit: boolean = false) {
    if (inputEmail.length > Config.MAX_MAIL_LEN) {
      return false;
    }

    if (onEdit) {
      for (const blockedNeedle of Config.MAIL_BLOCK_LIST) {
        if (inputEmail.includes(blockedNeedle)) {
          return false;
        }
      }
    }

    const isValid = emailValidator(inputEmail);
    return isValid;
  }

  export function throwIfInvalidReqBody(req: Request) {
    if (!isValidReqBody(req, ['email', 'password'])) {
      throw new Error(Config.REJECTED_USER_ERROR);
    }
  }
}

namespace Incubator {
  export async function getUserFromEmail(inputEmail: string): Promise<UserDocument | undefined> {
    const email = inputEmail.toLowerCase().trim();

    if (!Helpers.isValidTrimmedAndLowercasedEmail(email)) {
      return undefined;
    }

    const user = await User.findOne({ email });
    if (!user) {
      return undefined;
    }

    return user;
  }
}

export async function userSignup(req: Request, res: Response): Promise<void> {
  try {
    Helpers.throwIfInvalidReqBody(req);

    const email = req.body.email.toLowerCase().trim();
    if (!Helpers.isValidTrimmedAndLowercasedEmail(email, true)) {
      throw new Error(Config.REJECTED_USER_ERROR);
    }

    const givenPassword = req.body.password;
    if (!Helpers.isAuthorizedPassword(givenPassword)) {
      throw new Error(Config.TOO_SHORT_PASSWORD_ERROR);
    }

    const hashedPassword = await processPasswordHashing(givenPassword);
    if (!hashedPassword) {
      throw new Error(Config.FAILED_TO_HASH_PASSWORD_ERROR);
    }

    const user = new User({
      email,
      password: hashedPassword
    });

    const validationError: Error | null = user.validateSync();
    if (validationError) {
      throw validationError;
    }

    await user.save();
    res.status(StatusCodes.CREATED).json({ message: 'Utilisateur créé' });
  } catch (error) {
    printError(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorToObj(error));
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
