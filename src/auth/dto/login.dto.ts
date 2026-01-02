import { PickType } from "@nestjs/mapped-types";
import { SignupDto } from "./signup.dto";

export class LoginDto extends PickType(SignupDto, ["email", "password"]) { }