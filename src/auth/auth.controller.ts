import { Body, Controller, Get, HttpCode, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './auth.guard';
import RefreshTokensDto from './dto/refresh-tokens.dto';
import { PasswordResetDto } from './dto/password-reset.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }


  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    return await this.authService.signup(createUserDto);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  async profile(@Request() req) {
    return this.authService.profile(req.user.sub);
  }

  @Post('tokens-refresh')
  @HttpCode(200)
  async refreshTokens(@Body() refreshTokensDto: RefreshTokensDto) {
    return this.authService.refreshTokens(refreshTokensDto);
  }

  @Patch("password-reset")
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async resetPassword(@Request() req, @Body() passwordResetDto: PasswordResetDto) {
    return await this.authService.resetPassword(passwordResetDto, req.user.sub)

  }

  @UseGuards(AuthGuard)
  @Post('logout')
  @HttpCode(200)
  async logout(@Request() req) {
    return this.authService.logout(req.user.sub);
  }
}
