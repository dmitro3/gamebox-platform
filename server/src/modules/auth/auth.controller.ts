import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString() username!: string;
  @IsString() @MinLength(6) @MaxLength(30) password!: string;
  @IsOptional() @IsString() nickname?: string;
  @IsOptional() @IsString() inviteCode?: string;
}

export class LoginDto {
  @IsString() username!: string;
  @IsString() password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  /** POST /api/auth/register */
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  /** POST /api/auth/login */
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }
}
