import { Express } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { WebService, webService } from '../service/WebService.js';

class WebController {
  private webService: WebService;

  constructor(private app: Express) {
    this.webService = webService;

    app.use(
      cors({
        origin: 'http://localhost:3001',
        optionsSuccessStatus: 200,
      })
    );
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.post('/register', async (req, res) => {
      const { username, password, role } = req.body;
      const result = await this.webService.register(username, password, role);
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
