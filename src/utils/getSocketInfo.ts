import { Socket } from "socket.io";
import { UserPermissionType } from '../types/index.js';

export function getSocketInfo(socket: Socket) {
  const auth = socket.handshake.auth;
  const permission = auth.permission ?? 'guest' as UserPermissionType;
  const userId = auth.userId ?? 'guest';
  const nsp = socket.nsp.name;
  return {
    userId,
    nsp,
    permission,
  };
}