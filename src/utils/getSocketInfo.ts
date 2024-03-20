import { Socket } from "socket.io";
import { UserPermissionType } from '../types/index.js';
import { jwtService } from '../auth/JwtService.js';

export async function getSocketInfo(socket: Socket) {
  try {
    const auth = socket.handshake.auth;
    const permission = auth.permission ?? ('guest' as UserPermissionType);
    const userId = auth.userId ?? 'guest';
    const nsp = socket.nsp.name;
    const token = jwtService.verifyToken(auth.token);
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