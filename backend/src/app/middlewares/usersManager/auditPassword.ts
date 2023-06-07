import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZXCVBNResult, ZXCVBNScore } from 'zxcvbn';
import PasswordsConfig from '../../../config/PasswordsConfig';
import damerauLevenshtein from '../../lib/damerauLevenshtein';
import { printError } from '../../lib/debugger';
import { tryToFormatEmail } from '../../lib/emailValidator';
import errorToObj from '../../lib/errorToObj';
import getPasswordAudit from '../../lib/getPasswordAudit';

namespace Config {
  const { MAX_UNHASHED_PASSWORD_LEN, PASSWORD_EXAMPLE, MIN_UNHASHED_PASSWORD_LEN, MIN_PASSWORD_DIFFERENT_CHARACTERS } = PasswordsConfig;
  export const MIN_PASSWORD_DIFFERENT_CHARS: number = MIN_PASSWORD_DIFFERENT_CHARACTERS;
  export const MIN_PASSWORD_LEN: number = MIN_UNHASHED_PASSWORD_LEN;
  export const PASSWORD_IS_TOO_SIMILAR_TO_EMAIL_ERROR: string = "Votre mot de passe est trop similaire à l'adresse email de votre compte.";
  export const MAX_PASSWORD_LEN: number = MAX_UNHASHED_PASSWORD_LEN;
  export const TOO_SHORT_PASSWORD_ERROR: string = `Le mot de passe doit contenir entre ${MIN_PASSWORD_LEN} et ${MAX_PASSWORD_LEN} caractère${
    MAX_PASSWORD_LEN > 1 ? 's' : ''
  }, doit contenir au minimum ${MIN_PASSWORD_DIFFERENT_CHARS} caractère${
    MIN_PASSWORD_DIFFERENT_CHARS > 1 ? 's' : ''
  } différents, être suffisamment complexe ('12345678' n'est pas complexe, '${PASSWORD_EXAMPLE}' est complexe), et ne pas être détecté par notre système comme étant un mot de passe qui aurait fuité.`;
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

  export function throwIfPasswordIsTooSimilarToEmail(formattedEmail: string, givenPassword: string) {
    const minDistance = PasswordsConfig.MIN_EMAIL_AND_PASSWORD_DISTANCE;
    const givenPasswordLength = givenPassword.length;
    let givenPasswordAndGivenEmailDamerauLevenshteinDistance = minDistance + 1;

    if (givenPasswordLength >= Math.abs(givenPasswordLength - minDistance) && givenPasswordLength <= givenPasswordLength + minDistance) {
      givenPasswordAndGivenEmailDamerauLevenshteinDistance = damerauLevenshtein(formattedEmail, givenPassword);
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
}

export async function auditPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password: givenPassword } = req.body;
    const formattedEmail = tryToFormatEmail(email);

    Helpers.throwIfPasswordIsTooSimilarToEmail(formattedEmail, givenPassword);
    Helpers.throwIfUnauthorizedPassword(givenPassword);

    next();
  } catch (error) {
    printError(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(errorToObj(error));
  }
}

export default auditPassword;
