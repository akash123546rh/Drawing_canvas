class RoomManager {
  constructor() {
    this.rooms = new Map(); 
    this.userColors = new Map(); 
    this.availableColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    this.colorIndex = 0;
  }
  addUser(roomId, user) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }

    const room = this.rooms.get(roomId);
    
    
    if (!this.userColors.has(user.id)) {
      const color = this.availableColors[this.colorIndex % this.availableColors.length];
      this.userColors.set(user.id, color);
      this.colorIndex++;
      user.color = color;
    } else {
      user.color = this.userColors.get(user.id);
    }

    room.set(user.id, user);
    return user;

  }

  removeUser(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(userId);
      
    }
  }


  getUsers(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.values());
  }

  
  getUserColor(roomId, userId) {
    return this.userColors.get(userId) || this.availableColors[0];
  }
}

module.exports = { RoomManager };







