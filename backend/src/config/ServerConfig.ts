import { MAX_UNTRIMMED_MAIL_LEN } from '../app/lib/emailValidator';
import PasswordsConfig from './PasswordsConfig';

export namespace ServerConfig {
  const { MAX_UNHASHED_PASSWORD_LEN } = PasswordsConfig;

  export const PORT: string = '4000';
  export const IMAGES_FOLDER: string = 'images';
  export const IMAGES_FOLDER_RELATIVE_PATH_FROM_APP_CTX: string = `../../${IMAGES_FOLDER}`;

  export const DEFAULT_PAYLOAD_SIZE_LIMIT = '1mb';
  export const SIGNUP_PAYLOAD_SIZE_LIMIT = `${MAX_UNHASHED_PASSWORD_LEN + MAX_UNTRIMMED_MAIL_LEN}kb`;
  export const FILE_UPLOAD_MB_LIMIT: number = 15;

  export const UNKNOWN_ERROR = 'Erreur inconnue';
  export const DO_PRINT_ERRORS: boolean = true;
  export const DO_GIVE_STACKTRACES_IN_API_ERROR_RESPONSES: boolean = false;
}

export default ServerConfig;
