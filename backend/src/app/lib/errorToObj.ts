import ServerConfig from '../../config/ServerConfig';

const { DO_GIVE_STACKTRACES_IN_API_ERROR_RESPONSES } = ServerConfig;

export function errorToObj(error: unknown, getStack: boolean = DO_GIVE_STACKTRACES_IN_API_ERROR_RESPONSES) {
  if (error instanceof Error) {
    if (getStack) {
      return { error: error.message, errorStack: error.stack };
    }
    return { error: error.message };
  }
  return { error };
}

export default errorToObj;
