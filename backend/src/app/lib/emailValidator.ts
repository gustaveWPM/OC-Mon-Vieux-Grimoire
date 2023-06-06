import { validate as emailValidator } from 'email-validator';

export const MAX_UNTRIMMED_MAIL_LEN: number = 50;

const MAIL_BLOCK_LIST: string[] = ['@yopmail.com'];
const MAX_MAIL_LEN: number = 40;

const validateTrimmedEmailLength = (trimmedEmail: string): boolean => trimmedEmail.length <= MAX_MAIL_LEN;
export const rejectBeforeTrim = (inputEmail: string): boolean => inputEmail.length > MAX_UNTRIMMED_MAIL_LEN;

export function isValidEmail(inputEmail: string) {
  if (rejectBeforeTrim(inputEmail)) {
    return false;
  }

  const trimmedInputEmail = inputEmail.trim();
  if (!validateTrimmedEmailLength(trimmedInputEmail)) {
    return false;
  }
  
  const isValid = emailValidator(trimmedInputEmail);
  return isValid;
}

export function isAuthorizedEmail(inputEmail: string) {
  if (rejectBeforeTrim(inputEmail)) {
    return false;
  }

  const trimmedInputEmail = inputEmail.trim();
  for (const blockedNeedle of MAIL_BLOCK_LIST) {
    if (trimmedInputEmail.includes(blockedNeedle)) {
      return false;
    }
  }

  return true;
}

export function validator(inputEmail: string) {
  if (rejectBeforeTrim(inputEmail)) {
    return false;
  }

  const trimmedInputEmail = inputEmail.trim();
  if (!validateTrimmedEmailLength(trimmedInputEmail)) {
    return false;
  }

  if (!isAuthorizedEmail(trimmedInputEmail)) {
    return false;
  }

  return isValidEmail(trimmedInputEmail);
}

export const message = "Adresse email invalide: {VALUE} n'est pas une adresse email valide. Soit l'adresse email que vous avez entrée n'est pas une adresse email correcte, soit votre fournisseur d'adresse email est bloqué par notre système.";
