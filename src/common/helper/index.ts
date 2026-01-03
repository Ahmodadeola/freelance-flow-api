import { UnauthorizedException } from "@nestjs/common";
import { JsonWebTokenError, TokenExpiredError } from "@nestjs/jwt";


export const handleJWTTokenError = (error) => {
    if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token has expired');
    } else if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
    } else {
        throw error
    }
}

export const pickObjectFields = (obj: object, keys: Array<string>): Record<string, any> => {
    return Object.entries(obj).reduce((acc, [key, val]) => {
        if (keys.includes(key)) acc[key] = val
        return acc
    }, {})
}

export const dropObjectFields = (obj: object, keys: Array<string>): Record<string, any> => {
    return Object.entries(obj).reduce((acc, [key, val]) => {
        if (!keys.includes(key)) acc[key] = val
        return acc
    }, {})
}