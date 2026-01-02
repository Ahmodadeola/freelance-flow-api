import { UnauthorizedException } from "@nestjs/common";
import { JsonWebTokenError, TokenExpiredError } from "@nestjs/jwt";


export const handleJWTTokenError = (error) => {
    if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Access token has expired');
    } else if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
    } else {
        throw error
    }
}

