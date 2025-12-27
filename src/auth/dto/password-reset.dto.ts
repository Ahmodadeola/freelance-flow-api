import { IsNotEmpty, IsStrongPassword } from "class-validator";

export class PasswordResetDto {
    @IsStrongPassword()
    oldPassword: string;

    @IsStrongPassword()
    newPassword: string;
}