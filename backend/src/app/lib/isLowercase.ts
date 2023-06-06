export function isLowerCase(input: string): boolean {
  for (let i = 0; input[i]; i++) {
    if (input[i] !== input[i].toLowerCase()) {
      return false;
    }
  }
  return true;
}

export default isLowerCase;
