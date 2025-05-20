class HttpRequest {

  static getQueryParams(req, allowed = []) {
    // Use validatedQuery when available, otherwise fallback to regular query
    const querySource = req.validatedQuery || req.query;
    const query = {};

    if (allowed.length === 0) {
      return { ...querySource };
    }

    allowed.forEach(param => {
      if (querySource[param] !== undefined) {
        query[param] = querySource[param];
      }
    });

    return query;
  }

  static getBodyParams(req, allowed = []) {
    const body = {};

    if (allowed.length === 0) {
      return { ...req.body };
    }

    allowed.forEach(param => {
      if (req.body[param] !== undefined) {
        body[param] = req.body[param];
      }
    });

    return body;
  }

  static getUrlParams(req, allowed = []) {
    const params = {};

    if (allowed.length === 0) {
      return { ...req.params };
    }

    allowed.forEach(param => {
      if (req.params[param] !== undefined) {
        params[param] = req.params[param];
      }
    });

    return params;
  }


  static getIpAddress(req) {
    return req.ip ||
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.connection.remoteAddress;
  }


  static getUserAgent(req) {
    return req.headers['user-agent'] || '';
  }


  static getFiles(req) {
    return req.files || {};
  }


  static isAjax(req) {
    return req.xhr ||
      req.headers['x-requested-with'] === 'XMLHttpRequest';
  }


  static getHeaders(req, allowed = []) {
    const headers = {};

    if (allowed.length === 0) {
      return { ...req.headers };
    }

    allowed.forEach(header => {
      if (req.headers[header.toLowerCase()] !== undefined) {
        headers[header] = req.headers[header.toLowerCase()];
      }
    });

    return headers;
  }


  static getAuthToken(req) {
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/Bearer\s+(\S+)/i);
    return match ? match[1] : null;
  }
}

module.exports = HttpRequest;