export function validator(field: string): boolean {
  const lowercasedField = field.toLowerCase();
  const atLeastOneAlphanumCharReg = /[a-z0-9]/;
  const isValid = atLeastOneAlphanumCharReg.test(lowercasedField);

  return isValid;
}

export const message = 'Le champ doit contenir au minimum un caractère alphanumérique';
