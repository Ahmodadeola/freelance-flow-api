import { IsEmail, IsISO31661Alpha2, IsNotEmpty, IsOptional, IsString, IsStrongPassword, MaxLength, MinLength } from "class-validator";

export class SignupDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    firstName: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    lastName: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    businessName: string;

    @IsStrongPassword()
    password: string;

    @IsISO31661Alpha2()
    countryCode: string
}
