import { validate as emailValidator } from 'email-validator';
import { Request, Response } from 'express';
import StatusCodes from 'http-status-codes';
import jwt from 'jsonwebtoken';
import { ZXCVBNResult, ZXCVBNScore } from 'zxcvbn';
import PasswordsConfig from '../../config/PasswordsConfig';
import ServerConfig from '../../config/ServerConfig';
import damerauLevenshtein from '../lib/damerauLevenshtein';
import { printError } from '../lib/debugger';
import errorToObj from '../lib/errorToObj';
import getPasswordAudit from '../lib/getPasswordAudit';
import isValidReqBody from '../lib/isValidReqBody';
import User, { UserDocument } from '../models/User';
import { TOKENS_EXPIRATION_DELAY, isValidPassword, processPasswordHashing } from './critical/UserAuth';

namespace Config {
  const { MAX_UNHASHED_PASSWORD_LEN, PASSWORD_EXAMPLE, MIN_PASSWORD_DIFFERENT_CHARACTERS, MIN_UNHASHED_PASSWORD_LEN } = PasswordsConfig;
  export const MAX_MAIL_LEN: number = 40;
  export const MIN_PASSWORD_LEN: number = MIN_UNHASHED_PASSWORD_LEN;
  export const MAX_PASSWORD_LEN: number = MAX_UNHASHED_PASSWORD_LEN;
  export const MIN_PASSWORD_DIFFERENT_CHARS: number = MIN_PASSWORD_DIFFERENT_CHARACTERS;
  export const REJECTED_USER_ERROR: string = 'Paire identifiant/mot de passe incorrecte';
  export const TOO_SHORT_PASSWORD_ERROR: string = `Le mot de passe doit contenir entre ${MIN_PASSWORD_LEN} et ${MAX_PASSWORD_LEN} caractère${
    MAX_PASSWORD_LEN > 1 ? 's' : ''
  }, doit contenir au minimum ${MIN_PASSWORD_DIFFERENT_CHARS} caractère${
    MIN_PASSWORD_DIFFERENT_CHARS > 1 ? 's' : ''
  } différents, être suffisamment complexe ('12345678' n'est pas complexe, '${PASSWORD_EXAMPLE}' est complexe), et ne pas être détecté par notre système comme étant un mot de passe qui aurait fuité.`;
  export const PASSWORD_IS_TOO_SIMILAR_TO_EMAIL_ERROR: string = "Votre mot de passe est trop similaire à l'adresse email de votre compte.";
  export const FAILED_TO_HASH_PASSWORD_ERROR: string = ServerConfig.UNKNOWN_ERROR;
  export const FAILED_TO_RETRIEVE_TOKEN_SECRET_ERROR: string = ServerConfig.UNKNOWN_ERROR;
  export const TOKEN_SECRET = process.env.TOKEN_SECRET;
  export const MAIL_BLOCK_LIST: string[] = ['@yopmail.com'];
}

namespace Helpers {
  namespace Internals {
    export function buildAndThrowFailedPasswordAuditErrorMsg(passwordAudit: Partial<ZXCVBNResult>) {
      let errorMsg = Config.TOO_SHORT_PASSWORD_ERROR;

      const feedback = (passwordAudit as ZXCVBNResult).feedback;
      if (!feedback) {
        throw new Error(errorMsg);
      }

      if (feedback.warning && feedback.warning.length > 0) {
        errorMsg += '\n';
        errorMsg += `ZXCVBN Feedback warning: ${feedback.warning}`;
      }

      if (feedback.suggestions && feedback.suggestions.length > 0) {
        errorMsg += '\n';
        errorMsg += `ZXCVBN Feedback suggestions: ${feedback.suggestions.join('\n')}\n`;
      }

      throw new Error(errorMsg);
    }

    export function getPasswordAuditResult(inputPassword: string): Partial<ZXCVBNResult> {
      const notApprovedPasswordDefaultAuditValues = { score: 0 as ZXCVBNScore };
      if (inputPassword.length < Config.MIN_PASSWORD_LEN || inputPassword.length > Config.MAX_PASSWORD_LEN) {
        return notApprovedPasswordDefaultAuditValues;
      }

      const uniqCharsSet = new Set(inputPassword);
      if (uniqCharsSet.size < Config.MIN_PASSWORD_DIFFERENT_CHARS) {
        return notApprovedPasswordDefaultAuditValues;
      }

      let inputPasswordToTest = inputPassword;
      if (inputPassword.startsWith(PasswordsConfig.PASSWORD_EXAMPLE)) {
        inputPasswordToTest = inputPassword.substring(PasswordsConfig.PASSWORD_EXAMPLE.length);
      }

      const passwordAudit = getPasswordAudit(inputPasswordToTest);
      return passwordAudit;
    }
  }

  export const setRejectedUserResponse = (res: Response): Response =>
    res.status(StatusCodes.UNAUTHORIZED).json({ message: Config.REJECTED_USER_ERROR });

  export function throwIfPasswordIsTooSimilarToEmail(givenEmail: string, givenPassword: string) {
    const minDistance = PasswordsConfig.MIN_EMAIL_AND_PASSWORD_DISTANCE;
    const givenPasswordLength = givenPassword.length;
    let givenPasswordAndGivenEmailDamerauLevenshteinDistance = minDistance + 1;

    if (givenPasswordLength >= Math.abs(givenPasswordLength - minDistance) && givenPasswordLength <= givenPasswordLength + minDistance) {
      givenPasswordAndGivenEmailDamerauLevenshteinDistance = damerauLevenshtein(givenEmail, givenPassword);
    }

    if (givenPasswordAndGivenEmailDamerauLevenshteinDistance < minDistance) {
      throw new Error(Config.PASSWORD_IS_TOO_SIMILAR_TO_EMAIL_ERROR);
    }
  }

  export function throwIfUnauthorizedPassword(givenPassword: string) {
    const forbiddenExamplePasswordUsageError: Error = new Error(
      `Veuillez ne pas utiliser le mot de passe d'exemple fourni ('${PasswordsConfig.PASSWORD_EXAMPLE}'), ni un mot de passe qui y ressemble trop`
    );

    if (givenPassword === PasswordsConfig.PASSWORD_EXAMPLE) {
      throw forbiddenExamplePasswordUsageError;
    }

    const minDistance = PasswordsConfig.MIN_PASSWORD_EXAMPLE_DISTANCE;
    const examplePasswordLength = PasswordsConfig.PASSWORD_EXAMPLE.length;
    let givenPasswordAndGivenExamplePasswordDamerauLevenshteinDistance = minDistance + 1;

    if (givenPassword.length >= examplePasswordLength - minDistance && givenPassword.length <= examplePasswordLength + minDistance) {
      givenPasswordAndGivenExamplePasswordDamerauLevenshteinDistance = damerauLevenshtein(givenPassword, PasswordsConfig.PASSWORD_EXAMPLE);
    }

    if (givenPasswordAndGivenExamplePasswordDamerauLevenshteinDistance < minDistance) {
      throw forbiddenExamplePasswordUsageError;
    }

    const passwordAudit: Partial<ZXCVBNResult> = Internals.getPasswordAuditResult(givenPassword);
    if ((passwordAudit.score as ZXCVBNScore) < PasswordsConfig.MIN_ZXCVBN_SCORE) {
      Internals.buildAndThrowFailedPasswordAuditErrorMsg(passwordAudit);
    }
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

    const givenEmail = req.body.email.toLowerCase().trim();
    if (!Helpers.isValidTrimmedAndLowercasedEmail(givenEmail, true)) {
      throw new Error(Config.REJECTED_USER_ERROR);
    }

    const givenPassword = req.body.password;

    Helpers.throwIfPasswordIsTooSimilarToEmail(givenEmail, givenPassword);
    Helpers.throwIfUnauthorizedPassword(givenPassword);

    const hashedPassword = await processPasswordHashing(givenPassword);
    if (!hashedPassword) {
      throw new Error(Config.FAILED_TO_HASH_PASSWORD_ERROR);
    }

    const user = new User({
      email: givenEmail,
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
