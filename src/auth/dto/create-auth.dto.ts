import { PickType } from "@nestjs/mapped-types";
import { IsUUID } from "class-validator";
import { CreateUserDto } from "src/users/dto/create-user.dto";

export class CreateAuthDto extends PickType(CreateUserDto, ["email", "password"]) {
    @IsUUID()
    userId: string
}