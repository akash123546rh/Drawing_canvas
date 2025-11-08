const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { RoomManager } = require('./rooms');
const { DrawingState } = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;


app.use(express.static(path.join(__dirname, '../client')));


const roomManager = new RoomManager();
const drawingStates = new Map(); // roomId -> DrawingState

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  let currentRoom = null;
  let currentUserId = null;

  
  socket.on('join-room', ({ roomId, username }) => {
    currentRoom = roomId || 'default';
    currentUserId = socket.id;

    
    if (!drawingStates.has(currentRoom)) {
      drawingStates.set(currentRoom, new DrawingState());
    }

    
    const user = roomManager.addUser(currentRoom, {
      id: currentUserId,
      username: username || `User-${socket.id.substring(0, 6)}`,
      color: roomManager.getUserColor(currentRoom, currentUserId),
      socketId: socket.id
    });

    socket.join(currentRoom);

    
    const drawingState = drawingStates.get(currentRoom);
    socket.emit('canvas-state', {
      operations: drawingState.getOperations(),
      users: roomManager.getUsers(currentRoom)
    });

    
    socket.to(currentRoom).emit('user-joined', user)
    io.to(currentRoom).emit('users-updated', roomManager.getUsers(currentRoom));

    console.log(`${user.username} joined room ${currentRoom}`);
  });

  
  socket.on('draw-start', (data) => {
    if (!currentRoom) return;
    
    const drawingState = drawingStates.get(currentRoom);
    const operation = drawingState.addOperation({
      type: data.type,
      userId: currentUserId,
      color: data.color,
      lineWidth: data.lineWidth,
      points: data.points || [data.point],
      timestamp: data.timestamp || Date.now()
    });

    
    socket.emit('draw-start-ack', {
      operationId: operation.id
    });

    
    socket.to(currentRoom).emit('draw-start', {
      id: operation.id,
      type: operation.type,
      userId: currentUserId,
      color: operation.color,
      lineWidth: operation.lineWidth,
      points: operation.points,
      finalized: operation.finalized,
      undone: operation.undone || false,
      timestamp: operation.timestamp
    });
  });

  socket.on('draw-point', (data) => {
    if (!currentRoom) return;
    
    const drawingState = drawingStates.get(currentRoom);
    const operation = drawingState.addPointToLastOperation(currentUserId, data.point);

    if (operation) {
    
      socket.to(currentRoom).emit('draw-point', {
        operationId: operation.id,
        point: data.point,
        userId: currentUserId
      });
    }
  });

  socket.on('draw-end', (data) => {
    if (!currentRoom) return;
    
    const drawingState = drawingStates.get(currentRoom);
    const operation = drawingState.finalizeOperation(currentUserId);

    
    socket.to(currentRoom).emit('draw-end', {
      operationId: operation ? operation.id : null,
      userId: currentUserId
    });
  });

  
  socket.on('cursor-move', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('cursor-move', {
      userId: currentUserId,
      position: data.position
    });
  });

  
  socket.on('request-full-state', () => {
    if (!currentRoom) return;
    const drawingState = drawingStates.get(currentRoom);
    socket.emit('canvas-state', {
      operations: drawingState.getOperations(),
      users: roomManager.getUsers(currentRoom)
    });
  });
  
  
  setInterval(() => {
    drawingStates.forEach((drawingState, roomId) => {
      const users = roomManager.getUsers(roomId);
      if (users.length > 0) {
        io.to(roomId).emit('canvas-state', {
          operations: drawingState.getOperations(),
          users: users
        });
      }
    });
  }, 5000); 

  
  socket.on('undo', () => {
    if (!currentRoom) return;
    
    const drawingState = drawingStates.get(currentRoom);
    const operation = drawingState.undo(currentUserId);

    if (operation) {
      
      io.to(currentRoom).emit('canvas-state', {
        operations: drawingState.getOperations(),
        users: roomManager.getUsers(currentRoom)
      });
      
    
      io.to(currentRoom).emit('undo-operation', {
        operationId: operation.id,
        userId: currentUserId,
        username: roomManager.getUsers(currentRoom).find(u => u.id === currentUserId)?.username || 'User'
      });
    } else {
    
      socket.emit('undo-failed', { message: 'No operation to undo' });
    }
  });

  socket.on('redo', () => {
    if (!currentRoom) return;
    
    const drawingState = drawingStates.get(currentRoom);
    const operation = drawingState.redo(currentUserId);

    if (operation) {
    
      io.to(currentRoom).emit('canvas-state', {
        operations: drawingState.getOperations(),
        users: roomManager.getUsers(currentRoom)
      });
      
    
      io.to(currentRoom).emit('redo-operation', {
        operationId: operation.id,
        userId: currentUserId,
        username: roomManager.getUsers(currentRoom).find(u => u.id === currentUserId)?.username || 'User'
      });
    } else {
      
      socket.emit('redo-failed', { message: 'No operation to redo' });
    }
  });

  
  socket.on('clear-canvas', () => {
    if (!currentRoom) return;
    
    const drawingState = drawingStates.get(currentRoom);
    
    // Clear all operations
    drawingState.operations = [];
    drawingState.undoStacks.clear();
    drawingState.redoStacks.clear();
    drawingState.nextOperationId = 1;
    
    
    io.to(currentRoom).emit('canvas-cleared', {
      userId: currentUserId,
      username: roomManager.getUsers(currentRoom).find(u => u.id === currentUserId)?.username || 'User'
    });
    
  
    io.to(currentRoom).emit('canvas-state', {
      operations: [],
      users: roomManager.getUsers(currentRoom)
    });
    
    console.log(`Canvas cleared by ${currentUserId} in room ${currentRoom}`);
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      roomManager.removeUser(currentRoom, currentUserId);
      socket.to(currentRoom).emit('user-left', { userId: currentUserId });
      io.to(currentRoom).emit('users-updated', roomManager.getUsers(currentRoom));
      console.log(`User ${currentUserId} left room ${currentRoom}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

