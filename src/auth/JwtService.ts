import jwt from 'jsonwebtoken';

/**
 * JWT 토큰을 생성하고 검증하는 서비스입니다.
 *
 * 토큰 관리 로직
 * 1. 토큰 생성
 * - 사용자가 connection 시에 socket.handshake.auth 에 담긴 정보를 기반으로 사용자 정보를 확인 후 토큰을 생성합니다.
 * - 토큰은 사용자의 정보를 담고 있으며, 토큰의 만료 시간은 1시간으로 설정합니다.
 * - 생성된 토큰을 사용자에게 'token' 이벤트로 전달합니다.
 * 2. 토큰 검증
 * - 이제 클라이언트에서 토큰을 가지고 있으며, socket.io의 auth 옵션을 사용하여 토큰을 전달합니다.
 */

class JwtService {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  generateToken(payload: any): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        payload,
        this.secretKey,
        { expiresIn: '1m', algorithm: 'HS256' },
        (err: Error | null, token: string) => {
          if (err) {
            console.error('Error occurred while generating token:', err);
            reject(err);
          }
          resolve(token);
        }
      );
    });
  }

  verifyToken(token: string): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.secretKey,
        (err: Error | null, decoded: string) => {
          if (err) {
            console.error(
              'Error occurred while verifying token:',
              JSON.stringify(err, null, 2)
            );
            reject(err);
          }
          resolve(decoded);
        }
      );
    });
  }
}

export const jwtService = new JwtService(process.env.JWT_SECRET_KEY);
