export namespace ServerConfig {
  export const PORT: string = '4000';
  export const IMAGES_FOLDER: string = 'images';
  export const IMAGES_FOLDER_RELATIVE_PATH_FROM_APP_CTX: string = `../../${IMAGES_FOLDER}`;

  export const DO_PRINT_ERRORS: boolean = true;
  export const DO_GIVE_STACKTRACES_IN_API_ERROR_RESPONSES: boolean = false;
}

export default ServerConfig;
