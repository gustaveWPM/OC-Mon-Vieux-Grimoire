import getSlashEnvelope from '../app/lib/getSlashEnvelope';

namespace InternalsConfig {
  export const SERVLET: string = '/api';
}

const buildApiServiceRoutePrefixedWithServlet = (tail: string): string => getSlashEnvelope(InternalsConfig.SERVLET) + tail;

export namespace ApiConfig {
  export const AUTH_API_ROUTE: string = buildApiServiceRoutePrefixedWithServlet('auth');
  export const BOOKS_API_ROUTE: string = buildApiServiceRoutePrefixedWithServlet('books');
}

export default ApiConfig;
