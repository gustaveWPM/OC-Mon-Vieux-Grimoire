namespace InternalsConfig {
  export const SERVLET: string = '/api';
}

function buildApiServiceRoutePrefixedWithServlet(tail: string): string {
  const SERVLET: string = InternalsConfig.SERVLET;
  const head: string = (SERVLET.charAt(0) !== '/' ? '/' : '') + SERVLET + (SERVLET.charAt(SERVLET.length - 1) !== '/' ? '/' : '');
  return head + tail;
}

export namespace ApiConfig {
  export const AUTH_API_ROUTE: string = buildApiServiceRoutePrefixedWithServlet('auth');
  export const BOOKS_API_ROUTE: string = buildApiServiceRoutePrefixedWithServlet('books');
}

export default ApiConfig;
