const TokenUtils = require("../utils/token.utils")
const ErrorFactory = require("../factories/error.factory")

class AuthMiddleware {
    async authenticate(req, res, next) {
        try {
            const headerToken = req.headers.authorizarion || "";
            const token = TokenUtils.getTokenFromHeader(headerToken)

            if (!token) return ErrorFactory.unauthorized("Token Not Found")

            const user = await TokenUtils.verifyToken(token)

            req.user = user

            next()

        } catch (error) {
            next(error)
        }
    }

    authorize(...allowedRoles) {
        return (req, res, next) => {
            try {
                if (!req.user) {
                    return ErrorFactory.unauthorized("User not authenticated")
                }

                const userRole = req.user.role

                if (!allowedRoles.includes(userRole)) {
                    return ErrorFactory.forbidden(`Access denied. Required roles: ${allowedRoles.join(', ')}`)
                }

                next()
            } catch (error) {
                next(error)
            }
        }
    }



}

module.exports = new AuthMiddleware()