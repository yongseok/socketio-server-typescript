import { Socket } from 'socket.io';
import { UserPermissionType } from '../types/index.js';
import { jwtService } from '../auth/JwtService.js';

class SocketService {
  async getSocketInfo(socket: Socket) {
    try {
      const auth = socket.handshake.auth;
      const permission = auth.permission ?? ('guest' as UserPermissionType);
      const userId = auth.userId ?? 'guest';
      const nsp = socket.nsp.name;
      const token = await jwtService.verifyToken(auth.token);
      console.log('🚀 | SocketService | getSocketInfo | token:', token);
      return {
        ok: true,
        userId,
        nsp,
        permission,
        token,
      };
    } catch (error) {
      console.error('getSocketInfo error:', error);
      return { ok: false, errorMessage: 'getSocketInfo error' };
    }
  }

  async checkUserPermission(socket: Socket, next: (error?: any) => void) {
    try {
      const requestUserId = socket.handshake.auth.userId;
      const requestPermission = socket.handshake.auth.permission;

      const token = socket.handshake.auth.token;
      if (!token) {
        next(new Error('인증 토큰이 없습니다.'));
      }
      const { userId: tokenUserId, role: tokenUserPermissions } =
        await jwtService.verifyToken(token);

      if (requestUserId !== tokenUserId) {
        throw new Error(`인증된 사용자가 아닙니다. [${tokenUserId}]`);
      }

      // 클라이언트에서 전송한 권한 정보 확인
      const userHasPermission = tokenUserPermissions === requestPermission;

      if (userHasPermission) {
        console.log(`Authentication passed: ${tokenUserPermissions}`);
        next();
      } else {
        next(
          new Error(
            `'admin'등급만 접근 가능합니다. [현재등급: ${tokenUserPermissions}]`
          )
        );
      }
    } catch (error) {
      console.error('checkUserPermission error:', error.message);
      next(new Error(`${error.message}`));
    }
  }
}

export const socketService = new SocketService();
