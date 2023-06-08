import { validate as emailValidator } from 'email-validator';
import isLowerCase from './isLowercase';

export const MAX_UNTRIMMED_MAIL_LEN: number = 50;
const MAIL_BLOCK_LIST: string[] = ['@yopmail.com'];
const MAX_MAIL_LEN: number = 40;

export const message =
  "Adresse email invalide: {VALUE} n'est pas une adresse email valide. Soit l'adresse email que vous avez entrée n'est pas une adresse email correcte, soit votre fournisseur d'adresse email est bloqué par notre système.";

const validateTrimmedEmailLength = (trimmedEmail: string): boolean => trimmedEmail.length <= MAX_MAIL_LEN;
const rejectEmailBeforeTrim = (inputEmail: string): boolean => inputEmail.length > MAX_UNTRIMMED_MAIL_LEN;

export function tryToFormatEmail(inputEmail: string): string {
  if (rejectEmailBeforeTrim(inputEmail)) {
    throw new Error(message);
  }

  const formattedEmail = inputEmail.trim().toLowerCase();
  return formattedEmail;
}

function isAuthorizedEmail(inputEmail: string): boolean {
  try {
    const formattedInputEmail = tryToFormatEmail(inputEmail);
    for (const blockedNeedle of MAIL_BLOCK_LIST) {
      if (formattedInputEmail.includes(blockedNeedle)) {
        return false;
      }
    }
  } catch {
    return false;
  }
  return true;
}

function isValidEmail(inputEmail: string): boolean {
  if (rejectEmailBeforeTrim(inputEmail)) {
    return false;
  }

  const trimmedInputEmail = inputEmail.trim();
  if (!validateTrimmedEmailLength(trimmedInputEmail)) {
    return false;
  }

  if (!isLowerCase(trimmedInputEmail)) {
    return false;
  }

  if (!isAuthorizedEmail(trimmedInputEmail)) {
    return false;
  }

  const isValid = emailValidator(trimmedInputEmail);
  return isValid;
}

export function validator(inputEmail: string): boolean {
  return isValidEmail(inputEmail);
}
