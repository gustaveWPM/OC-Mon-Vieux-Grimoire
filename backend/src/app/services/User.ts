import { Request, Response } from 'express';
import StatusCodes from 'http-status-codes';
import jwt from 'jsonwebtoken';
import User, { UserDocument } from '../models/User';
import { TOKENS_EXPIRATION_DELAY, isValidPassword, processPasswordHashing } from './critical/UserAuth';

namespace Config {
  export const REJECTED_USER_MESSAGE: string = 'Paire identifiant/mot de passe incorrecte';
  export const FAILED_TO_HASH_PASSWORD_ERROR: string = 'Erreur inconnue';
  export const TOKEN_SECRET = process.env.TOKEN_SECRET;
}

namespace Helpers {
  export const setRejectedUserResponse = (res: Response): Response =>
    res.status(StatusCodes.UNAUTHORIZED).json({ message: Config.REJECTED_USER_MESSAGE });
  export const setInternalServerErrorResponse = (res: Response, error: unknown): Response =>
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error });
}

namespace Incubator {
  export async function getUserFromEmail(email: string): Promise<UserDocument | undefined> {
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

    const user = new User({
      email: req.body.email,
      password
    });
    await user.save();
    res.status(StatusCodes.CREATED).json({ message: 'Utilisateur créé' });
  } catch (error) {
    Helpers.setInternalServerErrorResponse(res, error);
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
    Helpers.setInternalServerErrorResponse(res, error);
  }
}
