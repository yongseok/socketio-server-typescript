import { Socket } from "socket.io";
import { getSocketInfo } from "./utils/index.js";
import { UserInfoType } from './types/index.js';

class UserManager {
  private userInfoMap: Map<string, UserInfoType>;

  constructor() {
    this.userInfoMap = new Map<string, UserInfoType>();
  }

  public addUser(uid: string, info: UserInfoType) {
    this.userInfoMap.set(uid, info);
  }

  public handleSocketEvent(ev: string, socket: Socket) {
    const { userId, nsp } = getSocketInfo(socket);

    switch (ev) {
      case 'connection':
        console.log(`connected user [${nsp}]: ${userId}`);
        const userInfo = this.getUser(userId);
        if (userInfo) {
          userInfo.sid.push(socket.id);
        } else {
          this.addUser(userId, {
            userId,
            permissions: 'guest',
            sid: [socket.id],
          });
        }
        break;
      case 'disconnect':
        console.log(`disconnected user [${nsp}]: ${userId}`);
        this.removeUserWithSid(socket.id);
        break;
      default:
        break;
    }
    this.printUserInfo();
  }

  public removeUserWithUid(uid: string) {
    this.userInfoMap.delete(uid);
  }

  public removeUserWithSid(sid: string) {
    this.userInfoMap.forEach((value: UserInfoType, key: string) => {
      const idx = value.sid.indexOf(sid);
      if (idx !== -1) {
        value.sid.splice(idx, 1);
        if (value.sid.length === 0) {
          this.userInfoMap.delete(key);
        }
      }
    });
  }

  public getUser(uid: string) {
    return this.userInfoMap.get(uid);
  }

  public printUserInfo() {
    console.log('userInfoMap:', this.userInfoMap);
  }
}

export const userManager = new UserManager();