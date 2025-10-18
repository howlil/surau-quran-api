const { PrismaClientKnownRequestError, PrismaClientValidationError, PrismaClientInitializationError, PrismaClientRustPanicError } = require('@prisma/client');

class PrismaErrorMiddleware {

    static handlePrismaError(err) {
        // Check if Prisma error classes are available and err is an instance
        try {
            if (PrismaClientKnownRequestError && err instanceof PrismaClientKnownRequestError) {
                return this.handleKnownRequestError(err);
            }

            if (PrismaClientValidationError && err instanceof PrismaClientValidationError) {
                return this.handleValidationError(err);
            }

            if (PrismaClientInitializationError && err instanceof PrismaClientInitializationError) {
                return this.handleInitializationError(err);
            }

            if (PrismaClientRustPanicError && err instanceof PrismaClientRustPanicError) {
                return this.handleRustPanicError(err);
            }

            // Check for Prisma errors by error code pattern
            if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
                return this.handleKnownRequestError(err);
            }

            return null;
        } catch (instanceofError) {
            // If instanceof check fails, check by error properties
            if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
                return this.handleKnownRequestError(err);
            }
            return null;
        }
    }

    static handleKnownRequestError(err) {
        const errorMappings = {
            'P2025': {
                statusCode: 404,
                message: "Record Not Found",
                error: {
                    message: "The requested record was not found",
                    type: "not_found"
                }
            },
            'P2002': {
                statusCode: 409,
                message: "Conflict",
                error: {
                    message: "A record with this information already exists",
                    type: "duplicate_entry",
                    details: this.parseDuplicateError(err)
                }
            },
            'P2003': {
                statusCode: 409,
                message: "Cannot Delete Record",
                error: {
                    message: "Cannot delete this record because it is being used by other records",
                    type: "foreign_key_constraint",
                    details: this.parseForeignKeyError(err.message)
                }
            },
            'P2014': {
                statusCode: 400,
                message: "Invalid ID",
                error: {
                    message: "The provided ID is invalid",
                    type: "invalid_id"
                }
            },
            'P2016': {
                statusCode: 400,
                message: "Query Interpretation Error",
                error: {
                    message: "The query could not be interpreted",
                    type: "query_error"
                }
            },
            'P2017': {
                statusCode: 400,
                message: "Record Not Connected",
                error: {
                    message: "The record is not connected to the required parent record",
                    type: "connection_error"
                }
            },
            'P2018': {
                statusCode: 400,
                message: "Required Connected Records Not Found",
                error: {
                    message: "Required connected records were not found",
                    type: "missing_connection"
                }
            },
            'P2019': {
                statusCode: 400,
                message: "Input Error",
                error: {
                    message: "Input error",
                    type: "input_error",
                    details: this.parseInputError(err)
                }
            },
            'P2020': {
                statusCode: 400,
                message: "Value Out of Range",
                error: {
                    message: "Value out of range for the field type",
                    type: "value_out_of_range"
                }
            },
            'P2021': {
                statusCode: 404,
                message: "Table Does Not Exist",
                error: {
                    message: "The table does not exist in the current database",
                    type: "table_not_found"
                }
            },
            'P2022': {
                statusCode: 404,
                message: "Column Does Not Exist",
                error: {
                    message: "The column does not exist in the current database",
                    type: "column_not_found"
                }
            }
        };

        const errorConfig = errorMappings[err.code];
        if (errorConfig) {
            return {
                statusCode: errorConfig.statusCode,
                message: errorConfig.message,
                error: errorConfig.error
            };
        }

        return {
            statusCode: 400,
            message: "Database Error",
            error: {
                message: this.cleanErrorMessage(err.message),
                type: "database_error",
                code: err.code
            }
        };
    }

    static handleValidationError(err) {
        const parsedError = this.parsePrismaValidationError(err.message);
        return {
            statusCode: 422,
            message: parsedError.message,
            error: parsedError
        };
    }

    static handleInitializationError(err) {
        return {
            statusCode: 500,
            message: "Database Connection Error",
            error: {
                message: this.cleanErrorMessage(err.message),
                type: "connection_error"
            }
        };
    }

    static handleRustPanicError(err) {
        return {
            statusCode: 500,
            message: "Database Internal Error",
            error: {
                message: "Internal database error occurred",
                type: "internal_error"
            }
        };
    }
    static parseForeignKeyError(message) {
        const cleanMessage = this.cleanErrorMessage(message);

        const foreignKeyMatch = cleanMessage.match(/Foreign key constraint violated on the fields: \(`([^`]+)`\)/);

        if (foreignKeyMatch) {
            const field = foreignKeyMatch[1];

            return {
                field: field,
                message: `Foreign key constraint violated on the fields: (${field})`,
            };
        }

        return {
            message: 'This record is being used by other records. Please remove all references before deleting.'
        };
    }

    static parseDuplicateError(err) {
        const cleanMessage = this.cleanErrorMessage(err.message);
        const fieldMatch = cleanMessage.match(/Unique constraint failed on the fields: \(`([^`]+)`\)/);

        if (fieldMatch) {
            return {
                field: fieldMatch[1],
                message: `A record with this ${fieldMatch[1]} already exists`
            };
        }

        return {
            message: 'A record with this information already exists'
        };
    }

    static parseInputError(err) {
        const cleanMessage = this.cleanErrorMessage(err.message);
        return {
            message: cleanMessage,
            type: 'input_validation_error'
        };
    }

    static parsePrismaValidationError(message) {
        const cleanMessage = this.cleanErrorMessage(message);

        if (cleanMessage.includes('Unknown field')) {
            const fieldMatch = cleanMessage.match(/Unknown field `([^`]+)` for select statement on model `([^`]+)`/);
            if (fieldMatch) {
                const [, fieldName, modelName] = fieldMatch;
                return {
                    message: `Field '${fieldName}' does not exist on model '${modelName}'. Please check the field name and try again.`,
                    type: 'field_not_found',
                    field: fieldName,
                    model: modelName,
                    suggestion: 'Check the Prisma schema for available fields'
                };
            }
        }

        if (cleanMessage.includes('Expected')) {
            const expectedMatch = cleanMessage.match(/Expected (\w+)/);
            if (expectedMatch) {
                return {
                    message: `Invalid data type. Expected: ${expectedMatch[1]}`,
                    type: 'type_mismatch',
                    expected: expectedMatch[1]
                };
            }
        }

        if (cleanMessage.includes('Invalid value')) {
            const valueMatch = cleanMessage.match(/Invalid value for argument `([^`]+)`\. Expected (\w+)\./);
            if (valueMatch) {
                const [, fieldName, expectedType] = valueMatch;
                return {
                    message: `Invalid value for field '${fieldName}'. Expected: ${expectedType}`,
                    type: 'invalid_value',
                    field: fieldName,
                    expected: expectedType
                };
            }
            
            // Fallback for other invalid value errors
            const simpleValueMatch = cleanMessage.match(/Invalid value for argument `([^`]+)`/);
            if (simpleValueMatch) {
                return {
                    message: `Invalid value for field '${simpleValueMatch[1]}'. Please check the value and try again.`,
                    type: 'invalid_value',
                    field: simpleValueMatch[1]
                };
            }
        }

        // Fallback to original logic
        const errorStart = cleanMessage.indexOf('Unknown field') !== -1 ?
            cleanMessage.indexOf('Unknown field') :
            cleanMessage.indexOf('Expected') !== -1 ?
                cleanMessage.indexOf('Expected') :
                cleanMessage.indexOf('missing') !== -1 ?
                    cleanMessage.indexOf('missing') :
                    0;

        const usefulMessage = cleanMessage.substring(errorStart);

        return {
            message: usefulMessage,
            type: 'validation_error'
        };
    }
    static cleanErrorMessage(message) {
        if (typeof message !== 'string') return message;

        return message
            .replace(/\u001b\[[0-9;]*m/g, '')
            .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
            .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
            .trim();
    }
}

module.exports = PrismaErrorMiddleware;