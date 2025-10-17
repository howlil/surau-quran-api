class RequestHttp {

    constructor(req) {
        this.req = req
    }

    #extract(source, allow = []) {
        if (allow.length === 0) {
            return { ...(source) }
        }

        const result = {}

        allow.forEach(field => {
            if (source && source[field] !== undefined) {
                result[field] = source[field];
            }
        });

        return result
    }

    getBody(allow = []) {
        return this.#extract(this.req.body, allow)
    }

    getQuery(allow = []) {
        const querySource = this.req.validatedQuery || this.req.query || {};
        return this.#extract(querySource, allow);
    }

    getParams(allow = []) {
        return this.#extract(this.req.params, allow);
    }

    getHeaders(allow = []) {
        return this.#extract(this.req.headers, allow);
    }

}

module.exports =  RequestHttp