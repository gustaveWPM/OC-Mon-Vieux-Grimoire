import { ZXCVBNScore } from 'zxcvbn';

export namespace PasswordsConfig {
  export const MIN_UNHASHED_PASSWORD_LEN: number = 8;
  export const MAX_UNHASHED_PASSWORD_LEN: number = 128;
  export const MIN_ZXCVBN_SCORE: ZXCVBNScore = 3;
  export const PASSWORD_EXAMPLE: string = 'JeSuisUneGuitare';
  export const MIN_PASSWORD_EXAMPLE_DISTANCE: number = 4;
  export const MIN_PASSWORD_DIFFERENT_CHARACTERS: number = 2;
}

export default PasswordsConfig;
