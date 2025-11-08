class WebSocketManager {
  constructor(socket) {
    this.socket = socket;
    this.operations = new Map(); 
    this.currentOperationId = null;
    this.pendingOperation = null;
    this.userId = null;
    this.users = new Map();
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.socket.on('canvas-state', (data) => {
      if (!this.userId) {
        this.userId = this.socket.id;
      }
      
      const existingOps = new Set(this.operations.keys());
      
      data.operations.forEach(op => {
        
        const operation = {
          ...op,
          undone: op.undone !== undefined ? op.undone : false
        };
        
      
        if (existingOps.has(operation.id)) {
          const localOp = this.operations.get(operation.id);
          if (!localOp.finalized && operation.finalized) {
            
            this.operations.set(operation.id, operation);
          } else {
            
            localOp.undone = operation.undone;
            localOp.finalized = operation.finalized;
  
            if (operation.points && operation.points.length > 0) {
              localOp.points = operation.points;
            }
          }
        } else {
          this.operations.set(operation.id, operation);
        }
      });
      
      
      data.users.forEach(user => {
        this.users.set(user.id, user);
      });
      
      
      if (window.canvasManager) {
        window.canvasManager.redrawCanvas();
      }
      
      this.updateUsersList();
    });

    
    this.socket.on('user-joined', (user) => {
      this.users.set(user.id, user);
      this.updateUsersList();
    });


    this.socket.on('user-left', (data) => {
      this.users.delete(data.userId);
      if (window.canvasManager) {
        window.canvasManager.removeRemoteCursor(data.userId);
      }
      this.updateUsersList();
    });

    
    this.socket.on('users-updated', (users) => {
      this.users.clear();
      users.forEach(user => {
        this.users.set(user.id, user);
      });
      this.updateUsersList();
    });

  
    this.socket.on('draw-start-ack', (data) => {
      if (this.pendingOperation) {
        this.pendingOperation.id = data.operationId;
        if (!this.userId) {
          this.userId = this.socket.id;
        }
        this.pendingOperation.userId = this.userId;
        this.operations.set(data.operationId, this.pendingOperation);
        this.currentOperationId = data.operationId;
        this.pendingOperation = null;
      }
    });

  
    this.socket.on('draw-start', (data) => {
      if (data.userId === this.userId) {
        return; 
      }
      
      const operation = {
        id: data.id,
        type: data.type,
        userId: data.userId,
        color: data.color,
        lineWidth: data.lineWidth,
        points: [...(data.points || [])],
        finalized: data.finalized !== undefined ? data.finalized : false,
        undone: data.undone !== undefined ? data.undone : false
      };
      
      this.operations.set(operation.id, operation);
    });

    this.socket.on('draw-point', (data) => {
      const operation = this.operations.get(data.operationId);
      if (operation && window.canvasManager) {
        if (data.userId !== this.userId) {
          if (operation.points.length > 0) {
            window.canvasManager.drawOperationPoint(data.operationId, data.point);
          } else {
            operation.points.push(data.point);
          }
        } else {
          if (!operation.points.includes(data.point)) {
            operation.points.push(data.point);
          }
        }
      }
    });

    this.socket.on('draw-end', (data) => {
    
      let operation = null;
      if (data.operationId) {
        operation = this.operations.get(data.operationId);
      } else {
        
        const ops = Array.from(this.operations.values());
        for (let i = ops.length - 1; i >= 0; i--) {
          if (ops[i].userId === data.userId && !ops[i].finalized) {
            operation = ops[i];
            break;
          }
        }
      }
      
      if (operation) {
        operation.finalized = true;
      }
      
      
      if (data.userId === this.userId) {
        this.currentOperationId = null;
      }
    });

    this.socket.on('cursor-move', (data) => {
      if (data.userId !== this.userId && window.canvasManager) {
        const user = this.users.get(data.userId);
        if (user) {
          window.canvasManager.updateRemoteCursor(
            data.userId,
            data.position,
            user.username,
            user.color
          );
        }
      }
    });

  
    this.socket.on('undo-operation', (data) => {
      let operation = this.operations.get(data.operationId);
      
      
      if (!operation) {
        console.warn(`Operation ${data.operationId} not found locally, requesting full state`);
    
        this.socket.emit('request-full-state');
        return;
      }
      
  
      operation.undone = true;
      
      
      if (window.canvasManager) {
        window.canvasManager.redrawCanvas();
      }
    });

    this.socket.on('redo-operation', (data) => {
      let operation = this.operations.get(data.operationId);
      
  
      if (!operation) {
        console.warn(`Operation ${data.operationId} not found locally, requesting full state`);
        
        this.socket.emit('request-full-state');
        return;
      }
      
      
      operation.undone = false;
      
      
      if (window.canvasManager) {
        window.canvasManager.redrawCanvas();
      }
    });

  
    this.socket.on('undo-failed', (data) => {
      console.log('Cannot undo:', data.message);
    });

    this.socket.on('redo-failed', (data) => {
      console.log('Cannot redo:', data.message);
    });

  
    this.socket.on('canvas-cleared', (data) => {
      
      this.operations.clear();
      
  
      if (window.canvasManager) {
        window.canvasManager.clearCanvasVisual();
      }
      
      console.log(`Canvas cleared by ${data.username}`);
    });

    
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }

  joinRoom(roomId, username) {
    this.socket.emit('join-room', { roomId, username });
  }

  startDrawing(point) {
    const operation = {
      type: window.canvasManager.currentTool,
      color: window.canvasManager.currentColor,
      lineWidth: window.canvasManager.currentLineWidth,
      points: [point],
      timestamp: Date.now()
    };
    
    
    this.pendingOperation = {
      ...operation,
      finalized: false,
      undone: false
    };
    
    this.socket.emit('draw-start', operation);
  }

  addDrawingPoint(point) {
    this.socket.emit('draw-point', { point });
  }

  endDrawing() {
    this.socket.emit('draw-end', {});
  }

  updateCursor(position) {
    this.socket.emit('cursor-move', { position });
  }

  undo() {
    this.socket.emit('undo');
  }

  redo() {
    this.socket.emit('redo');
  }

  clearCanvas() {
    
    this.socket.emit('clear-canvas');
  }

  getOperation(operationId) {
    return this.operations.get(operationId);
  }

  getAllOperations() {
  
    return Array.from(this.operations.values()).sort((a, b) => a.id - b.id);
  }

  updateUsersList() {
    const usersList = document.getElementById('users-list');
    if (!usersList) return;
    
    usersList.innerHTML = '';
    
    this.users.forEach(user => {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';
      
      const colorIndicator = document.createElement('div');
      colorIndicator.className = 'user-color-indicator';
      colorIndicator.style.backgroundColor = user.color;
      
      const userName = document.createElement('div');
      userName.className = 'user-name';
      userName.textContent = user.username;
      if (user.id === this.userId) {
        userName.textContent += ' (You)';
        userName.style.fontWeight = '600';
      }
      
      userItem.appendChild(colorIndicator);
      userItem.appendChild(userName);
      usersList.appendChild(userItem);
    });
    
  
    const usersCount = document.getElementById('users-online');
    if (usersCount) {
      const count = this.users.size;
      usersCount.textContent = `${count} user${count !== 1 ? 's' : ''} online`;
    }
  }
}
window.WebSocketManager = WebSocketManager;

