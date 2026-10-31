import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
  personNameSchema,
} from '@brightloop/shared';
import { Public } from '../../common/auth/public.decorator.js';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { loadEnvironment } from '../../config/environment.js';
import { AuthService, type Session } from './auth.service.js';

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
const signupSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  password: passwordSchema,
});
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});
const COOKIE = 'brightloop_refresh';

@Controller('auth')
export class AuthController {
  private readonly env = loadEnvironment();

  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: z.infer<typeof loginSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(res, await this.auth.login(body.email, body.password));
  }

  @Public()
  @Post('signup')
  async signup(
    @Body(new ZodValidationPipe(signupSchema))
    body: z.infer<typeof signupSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(
      res,
      await this.auth.signup(body.name, body.email, body.password),
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(res, await this.auth.refresh(this.cookie(req)));
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(this.cookie(req));
    res.clearCookie(COOKIE, { path: '/api/v1/auth' });
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.sub);
  }

  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(changePasswordSchema))
    body: z.infer<typeof changePasswordSchema>,
  ) {
    await this.auth.changePassword(
      user.sub,
      body.currentPassword,
      body.newPassword,
    );
  }

  private cookie(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[COOKIE];
  }

  private respond(res: Response, session: Session) {
    res.cookie(COOKIE, session.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.env.WEB_URL.startsWith('https:'),
      path: '/api/v1/auth',
      maxAge: this.env.REFRESH_TTL_DAYS * 86_400_000,
    });
    return { accessToken: session.accessToken, user: session.user };
  }
}
