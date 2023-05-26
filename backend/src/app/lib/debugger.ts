import ServerConfig from '../../config/ServerConfig';

export function printError(error: unknown, forcedToPrint?: undefined | true) {
  const { DO_PRINT_ERRORS } = ServerConfig;
  if (!DO_PRINT_ERRORS && !forcedToPrint) {
    return;
  }
  console.error(error);
}
