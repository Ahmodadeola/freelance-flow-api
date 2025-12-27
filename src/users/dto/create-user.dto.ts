import { IsEmail, IsNotEmpty, IsString, IsStrongPassword, MaxLength } from "class-validator";

export class CreateUserDto {
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

    @IsStrongPassword()
    password: string;
}
