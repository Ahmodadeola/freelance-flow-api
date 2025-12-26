import { IsJWT, IsNotEmpty, IsString } from "class-validator";

export default class RefreshTokensDto {
    @IsString()
    @IsNotEmpty()
    @IsJWT()
    refreshToken: string;

    @IsString()
    @IsNotEmpty()
    @IsJWT()
    accessToken: string;
}