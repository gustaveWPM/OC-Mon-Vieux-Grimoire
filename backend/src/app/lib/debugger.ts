import ServerConfig from '../../config/ServerConfig';

export function printError(error: unknown) {
  const { DO_PRINT_ERRORS } = ServerConfig;
  if (!DO_PRINT_ERRORS) {
    return;
  }
  console.error(error);
}
