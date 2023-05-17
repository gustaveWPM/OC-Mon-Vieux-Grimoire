const MAX_MAGNITUDE = 10;

export function validator(y: unknown): boolean {
  let isValid = false;
  if (typeof y === 'string') {
    if (y.length <= 0) {
      return false;
    }
    let parsedYearNumber = y.trim();
    if (parsedYearNumber[0] === '-') {
      parsedYearNumber = parsedYearNumber.substring(1);
    }
    isValid = parsedYearNumber.length <= MAX_MAGNITUDE;
    if (!isValid) {
      return false;
    }
    const reg = /^\d+$/;
    isValid = reg.test(parsedYearNumber);
    return isValid;
  } else if (typeof y === 'number') {
    isValid = Math.abs(y) < 10 ** (MAX_MAGNITUDE + 1);
    return isValid;
  } else {
    return false;
  }
}

export const message = "L'année doit être un nombre entier négatif ou positif, par exemple sous la forme : '-120' ou '120', sans les guillemets";
