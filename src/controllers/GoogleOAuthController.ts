import { UserInfo } from '../types/user.js';
import express from 'express';
import { jwtService } from '../auth/JwtService.js';
import { GoogleOAuthService } from '../service/GoogleOAuthService.js';

export class GoogleOAuthController {
  private googleOAuthService: GoogleOAuthService;

  constructor(redirectPath: string) {
    this.googleOAuthService = new GoogleOAuthService(redirectPath);
  }

  middleware() {
    const router = express.Router();

    router.get('/login/google', (req, res) => {
      const url = this.googleOAuthService.generateAuthUrl('login');
      res.redirect(url);
    });

    router.get('/signup/google', (req, res) => {
      const url = this.googleOAuthService.generateAuthUrl('signup');
      res.redirect(url);
    });

    router.get('/auth/google/redirect', async (req, res) => {
      const state = req.query.state;
      const code = req.query.code as string;
      let result: { ok: boolean; userInfo?: UserInfo; error?: any };

      try {
        if (state === 'login') {
          console.log('🔑 로그인 처리');
          result = await this.googleOAuthService.login(code);
        } else if (state === 'signup') {
          console.log('📝 회원 가입 처리');
          result = await this.googleOAuthService.register(code);
        }

        if (result.ok) {
          // token 발행
          const messengerToken = await jwtService.generateToken(
            result.userInfo
          );
          res.json({ ok: true, token: messengerToken });
        } else {
          res.json({ ok: false, error: result.error });
        }
      } catch (error) {
        console.log(error);
        res.json({ ok: false, error });
      }
    });

    return router;
  }
}
