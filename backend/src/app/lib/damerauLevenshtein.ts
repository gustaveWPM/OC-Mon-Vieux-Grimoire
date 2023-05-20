// * ... https://en.wikipedia.org/wiki/Damerau–Levenshtein_distance

export function damerauLevenshtein(s1: string, s2: string): number {
  const matrix: number[][] = new Array(s1.length + 1).fill(0).map(() => new Array(s2.length + 1).fill(0));

  for (let i: number = 0; i <= s1.length; i++) {
    matrix[i][0] = i;
  }

  for (let j: number = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i: number = 1; i <= s1.length; i++) {
    for (let j: number = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
        if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
          matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
        }
      }
    }
  }
  return matrix[s1.length][s2.length];
}

export default damerauLevenshtein;
