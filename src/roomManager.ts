import { Socket } from "socket.io";
import { getSocketInfo } from "./utils/getSocketInfo.js";

class RoomManager {
  private rooms: Map<string, Set<string>>;

  constructor() {
    this.rooms = new Map();
  }

  public joinRoom(socket: Socket, roomId: string): void {
    const { userId } = getSocketInfo(socket);
    if (!this.rooms.has(userId)) {
      this.rooms.set(userId, new Set());
    }
    this.rooms.get(userId)?.add(roomId);
    this.printRoomsInfo();
  }

  public leaveRoom(socket: Socket, roomId: string): void {
    const { userId } = getSocketInfo(socket);
    const userRooms = this.rooms.get(userId);
    if (userRooms) {
      userRooms.delete(roomId);
      if (userRooms.size === 0) {
        this.rooms.delete(userId);
      }
    }
    this.printRoomsInfo();
  }

  public getUserRooms(socket: Socket): Set<string> | undefined {
    const { userId } = getSocketInfo(socket);
    return this.rooms.get(userId);
  }
  public async getUserRoomsWithUserId(userId: string): Promise<Set<string> | undefined> {
    return this.rooms.get(userId);
  }

  public printRoomsInfo(): void {
    console.log('🚀rooms:', this.rooms);
  }
}
export const roomManager = new RoomManager();

// Usage example:
// const roomManager = new RoomManager();
// roomManager.addRoom("user1", "room1");
// roomManager.addRoom("user1", "room2");
// roomManager.addRoom("user2", "room1");
// roomManager.addRoom("user2", "room3");

// console.log(roomManager.getUserRooms("user1")); // Output: Set { 'room1', 'room2' }
// console.log(roomManager.getUserRooms("user2")); // Output: Set { 'room1', 'room3' }

// roomManager.removeRoom("user1", "room1");
// console.log(roomManager.getUserRooms("user1")); // Output: Set { 'room2' }