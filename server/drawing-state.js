class DrawingState {
  constructor() {
    this.operations = [];
    this.undoStacks = new Map(); 
    this.redoStacks = new Map();
    this.nextOperationId = 1;
  }

  
  addOperation(operationData) {
    const operation = {
      id: this.nextOperationId++,
      type: operationData.type, 
      userId: operationData.userId,
      color: operationData.color,
      lineWidth: operationData.lineWidth,
      points: [...operationData.points],
      timestamp: operationData.timestamp || Date.now(),
      finalized: false,
      undone: false  
    };

    this.operations.push(operation);
    
   
    if (this.redoStacks.has(operationData.userId)) {
      this.redoStacks.get(operationData.userId).length = 0;
    }
    
    return operation;
  }

  addPointToLastOperation(userId, point) {
    // Find the last non-finalized operation for this user
    for (let i = this.operations.length - 1; i >= 0; i--) {
      const op = this.operations[i];
      if (op.userId === userId && !op.finalized) {
        op.points.push(point);
        return op;
      }
    }
    return null;
  }

  
  finalizeOperation(userId) {
    for (let i = this.operations.length - 1; i >= 0; i--) {
      const op = this.operations[i];
      if (op.userId === userId && !op.finalized) {
        op.finalized = true;
        return op;
      }
    }
    return null;
  }


  undo(userId) {
    
    for (let i = this.operations.length - 1; i >= 0; i--) {
      const op = this.operations[i];
      if (op.userId === userId && op.finalized && !op.undone) {
        op.undone = true;
        
        
        if (!this.undoStacks.has(userId)) {
          this.undoStacks.set(userId, []);
        }
        this.undoStacks.get(userId).push(op.id);
        
        return op;
      }
    }
    return null;
  }

  
  redo(userId) {
    const undoStack = this.undoStacks.get(userId);
    if (!undoStack || undoStack.length === 0) return null;
    const operationId = undoStack[undoStack.length - 1];
    const operation = this.operations.find(op => op.id === operationId);
    
    if (operation && operation.undone && operation.userId === userId) {
      operation.undone = false;
      undoStack.pop(); 
      
  
      if (!this.redoStacks.has(userId)) {
        this.redoStacks.set(userId, []);
      }
      this.redoStacks.get(userId).push(operation.id);
      
      return operation;
    }
    return null;
  }

 
  getOperations() {
    return this.operations.filter(op => op.finalized).map(op => ({
      ...op,
      undone: op.undone || false
    }));
  }

 
  getOperation(operationId) {
    return this.operations.find(op => op.id === operationId);
  }
}

module.exports = { DrawingState };

