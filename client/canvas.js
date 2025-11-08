
class CanvasManager {
  constructor(canvasId, cursorCanvasId) {
    this.canvas = document.getElementById(canvasId);
    this.cursorCanvas = document.getElementById(cursorCanvasId);
    this.ctx = this.canvas.getContext('2d');
    this.cursorCtx = this.cursorCanvas.getContext('2d');
    
    this.setupCanvas();
    this.setupEventListeners();
    
    
    this.isDrawing = false;
    this.currentTool = 'brush';
    this.currentColor = '#000000';
    this.currentLineWidth = 5;
    this.lastPoint = null;
    
    
    this.remoteCursors = new Map();
    
    
    this.localOperations = [];
    this.operationHistory = [];
    
    
    this.pointBuffer = [];
    this.bufferThreshold = 3; 
  }

  setupCanvas() {
    // Set canvas size
    const resizeCanvas = () => {
      const container = this.canvas.parentElement;
      const maxWidth = Math.min(container.clientWidth - 40, 1200);
      const maxHeight = container.clientHeight - 40;
      
      const size = Math.min(maxWidth, maxHeight);
      
      this.canvas.width = size;
      this.canvas.height = size;
      this.cursorCanvas.width = size;
      this.cursorCanvas.height = size;
      
      
      this.redrawCanvas();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', (e) => this.handleStart(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
    this.canvas.addEventListener('mouseup', () => this.handleEnd());
    this.canvas.addEventListener('mouseleave', () => this.handleEnd());
    
    
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    });
    
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handleEnd();
    });
  }

  getPointFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  handleStart(e) {
    this.isDrawing = true;
    const point = this.getPointFromEvent(e);
    this.lastPoint = point;
    
    
    this.currentOperation = {
      type: this.currentTool,
      color: this.currentColor,
      lineWidth: this.currentLineWidth,
      points: [point]
    };
    
    
    if (window.webSocketManager) {
      window.webSocketManager.startDrawing(point);
    }
  }

  handleMove(e) {
    const point = this.getPointFromEvent(e);
    
    if (this.isDrawing) {
  
      this.drawPoint(this.lastPoint, point, this.currentOperation);
      this.lastPoint = point;
      
      
      this.currentOperation.points.push(point);
      
      
      if (this.currentOperation.points.length % this.bufferThreshold === 0) {
        if (window.webSocketManager) {
          window.webSocketManager.addDrawingPoint(point);
        }
      }
    }
    
    
    if (window.webSocketManager) {
      const rect = this.canvas.getBoundingClientRect();
      window.webSocketManager.updateCursor({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }

  handleEnd() {
    if (this.isDrawing) {
      this.isDrawing = false;
      
      if (window.webSocketManager && this.currentOperation) {
        window.webSocketManager.addDrawingPoint(this.lastPoint);
        window.webSocketManager.endDrawing();
      }
      
      if (this.currentOperation) {
        this.localOperations.push({
          ...this.currentOperation,
          id: Date.now()
        });
      }
      
      this.currentOperation = null;
      this.lastPoint = null;
    }
  }

  drawPoint(point1, point2, operation) {
    this.ctx.save();
    
    if (operation.type === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = operation.color;
    }
    
    this.ctx.lineWidth = operation.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    this.ctx.beginPath();
    this.ctx.moveTo(point1.x, point1.y);
    this.ctx.lineTo(point2.x, point2.y);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  
  drawOperation(operation) {
    if (!operation.points || operation.points.length < 2) return;
    
    this.ctx.save();
    
    if (operation.type === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = operation.color;
    }
    
    this.ctx.lineWidth = operation.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    this.ctx.beginPath();
    this.ctx.moveTo(operation.points[0].x, operation.points[0].y);
    
    for (let i = 1; i < operation.points.length; i++) {
      this.ctx.lineTo(operation.points[i].x, operation.points[i].y);
    }
    
    this.ctx.stroke();
    this.ctx.restore();
  }

  
  drawOperationPoint(operationId, point) {
    if (window.webSocketManager) {
      const operation = window.webSocketManager.getOperation(operationId);
      if (operation && operation.points.length > 0) {
        const lastPoint = operation.points[operation.points.length - 1];
        this.drawPoint(lastPoint, point, operation);
        operation.points.push(point);
      } else if (operation && operation.points.length === 0) {
      
        operation.points.push(point);
      }
    }
  }

  
  redrawCanvas() {
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    
    if (window.webSocketManager) {
      const operations = window.webSocketManager.getAllOperations();
      operations
        .filter(op => op.finalized && !op.undone && op.points && op.points.length > 0)
        .forEach(op => {
          this.drawOperation(op);
        });
    }
  }

  
  updateRemoteCursor(userId, position, username, color) {
    if (!this.remoteCursors.has(userId)) {
      this.remoteCursors.set(userId, { position, username, color });
    } else {
      const cursor = this.remoteCursors.get(userId);
      cursor.position = position;
    }
    
    this.drawRemoteCursors();
  }

  removeRemoteCursor(userId) {
    this.remoteCursors.delete(userId);
    this.drawRemoteCursors();
  }

  drawRemoteCursors() {
    
    this.cursorCtx.clearRect(0, 0, this.cursorCanvas.width, this.cursorCanvas.height);
    
    
    this.remoteCursors.forEach((cursor, userId) => {
      const rect = this.canvas.getBoundingClientRect();
     
      const scaleX = this.cursorCanvas.width / rect.width;
      const scaleY = this.cursorCanvas.height / rect.height;
      
      const x = cursor.position.x * scaleX;
      const y = cursor.position.y * scaleY;
      
      this.cursorCtx.save();
      this.cursorCtx.fillStyle = cursor.color;
      this.cursorCtx.beginPath();
      this.cursorCtx.arc(x, y, 5, 0, Math.PI * 2);
      this.cursorCtx.fill();
      this.cursorCtx.strokeStyle = 'white';
      this.cursorCtx.lineWidth = 2;
      this.cursorCtx.stroke();
      
  
      this.cursorCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.cursorCtx.font = '12px sans-serif';
      const textWidth = this.cursorCtx.measureText(cursor.username).width;
      this.cursorCtx.fillRect(x - textWidth / 2 - 4, y + 10, textWidth + 8, 18);
      this.cursorCtx.fillStyle = 'white';
      this.cursorCtx.textAlign = 'center';
      this.cursorCtx.fillText(cursor.username, x, y + 22);
      
      this.cursorCtx.restore();
    });
  }

  setTool(tool) {
    this.currentTool = tool;
  }

  setColor(color) {
    this.currentColor = color;
  }

  setLineWidth(width) {
    this.currentLineWidth = width;
  }

  clearCanvas() {
    
    if (window.webSocketManager) {
      window.webSocketManager.clearCanvas();
    }
  }

  clearCanvasVisual() {
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}


window.CanvasManager = CanvasManager;

