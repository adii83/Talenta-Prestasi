import { Controller, Post, Body } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-z0-9._-]+$/)
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }
}
