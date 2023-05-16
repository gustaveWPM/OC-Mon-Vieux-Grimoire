import { validate as emailValidator } from 'email-validator';
import { Request, Response } from 'express';
import StatusCodes from 'http-status-codes';
import jwt from 'jsonwebtoken';
import { printError } from '../lib/Debugger';
import errorToObj from '../lib/ErrorToObj';
import User, { UserDocument } from '../models/User';
import { TOKENS_EXPIRATION_DELAY, isValidPassword, processPasswordHashing } from './critical/UserAuth';

namespace Config {
  export const REJECTED_USER_MESSAGE: string = 'Paire identifiant/mot de passe incorrecte';
  export const FAILED_TO_HASH_PASSWORD_ERROR: string = 'Erreur inconnue';
  export const TOKEN_SECRET = process.env.TOKEN_SECRET;
  export const MAX_MAIL_LEN: number = 40;
  export const MAIL_BLOCK_LIST: string[] = ['@yopmail.com'];
}

namespace Helpers {
  export const setRejectedUserResponse = (res: Response): Response =>
    res.status(StatusCodes.UNAUTHORIZED).json({ message: Config.REJECTED_USER_MESSAGE });

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
    const password = await processPasswordHashing(req.body.password);
    if (!password) {
      throw new Error(Config.FAILED_TO_HASH_PASSWORD_ERROR);
    }

    const email = req.body.email.toLowerCase().trim();
    if (!Helpers.isValidTrimmedAndLowercasedEmail(email, true)) {
      throw new Error(Config.REJECTED_USER_MESSAGE);
    }

    const user = new User({
      email,
      password
    });
    await user.save();
    res.status(StatusCodes.CREATED).json({ message: 'Utilisateur créé' });
  } catch (error) {
    printError(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorToObj(error));
  }
}

export async function userLogin(req: Request, res: Response) {
  try {
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
      throw new Error('CRITICAL ERROR: Missing TOKEN_SECRET value in .env!');
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
