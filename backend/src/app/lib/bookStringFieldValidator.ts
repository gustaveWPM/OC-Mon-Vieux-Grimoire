const UNTRIMMED_BOOK_STRING_FIELD_MAX_SIZE = 650;
const BOOK_STRING_FIELD_MAX_SIZE = 500;

export function validator(field: string): boolean {
  if (field.length > UNTRIMMED_BOOK_STRING_FIELD_MAX_SIZE) {
    return false;
  }

  const trimmedField = field.trim();
  if (trimmedField.length > BOOK_STRING_FIELD_MAX_SIZE) {
    return false;
  }
  const lowercasedField = trimmedField.toLowerCase();
  const atLeastOneAlphanumCharReg = /[a-z0-9]/;
  const isValid = atLeastOneAlphanumCharReg.test(lowercasedField);

  return isValid;
}

export const message = `Le champ doit contenir au minimum un caractère alphanumérique, et doit faire une longueur de maximum ${BOOK_STRING_FIELD_MAX_SIZE} caractère${
  BOOK_STRING_FIELD_MAX_SIZE > 1 ? 's' : ''
}`;
