import { Express } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { WebService, webService } from '../service/WebService.js';
import { UserInfo } from '../types/user.js';
import { GoogleOAuthController } from '../controllers/GoogleOAuthController.js';

class WebController {
  private webService: WebService;

  constructor(private app: Express) {
    this.webService = webService;
    const googleOAuthController = new GoogleOAuthController(
      '/auth/google/redirect'
    );

    app.use(
      cors({
        origin: 'http://localhost:3001',
        optionsSuccessStatus: 200,
      })
    );
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(googleOAuthController.middleware());

    app.post('/register', async (req, res) => {
      const { username, password, role } = req.body;
      const userInfo: UserInfo = {
        id: username,
        name: username,
        permissions: role,
        password: password,
        verifiedEmail: false,
        registratioType: 'local',
      };
      const result = await this.webService.register(userInfo);
      if (result.ok) {
        res.send({ message: '회원가입 성공' });
      } else {
        res.status(400).send({ error: result.errorMessage || '회원가입 실패' });
      }
    });

    app.post('/login', async (req, res) => {
      const { username, password, role } = req.body;
      const result = await this.webService.login(username, password, role);
      if (result.ok) {
        res.send({ token: result.token });
      } else {
        res.send({ error: result.errorMessage || '로그인 실패' });
      }
    });
  }
}

export { WebController };
