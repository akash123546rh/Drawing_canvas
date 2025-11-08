(function() {
  let socket;
  let canvasManager;
  let webSocketManager;


  function init() {
    const joinModal = document.getElementById('join-modal');
    const usernameInput = document.getElementById('username-input');
    const joinBtn = document.getElementById('join-btn');

    function doJoin(name) {
      const username = (name && name.trim().length > 0) ? name.trim() : 'Guest';
      document.getElementById('username-display').textContent = username;

      
  socket = io(window.SOCKET_URL && window.SOCKET_URL.length ? window.SOCKET_URL : undefined);
      webSocketManager = new WebSocketManager(socket);
      window.webSocketManager = webSocketManager;

      
      canvasManager = new CanvasManager('drawing-canvas', 'cursor-layer');
      window.canvasManager = canvasManager;

    
      webSocketManager.joinRoom('default', username);

      
      setupToolbar();

    
      if (joinModal) {
        joinModal.style.display = 'none';
        joinModal.setAttribute('aria-hidden', 'true');
      }
    }

    
    if (joinBtn) {
      joinBtn.addEventListener('click', () => doJoin(usernameInput.value));
    }
    if (usernameInput) {
      usernameInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') doJoin(usernameInput.value);
      });
      usernameInput.focus();
    }
  }

  function setupToolbar() {
    document.getElementById('tool-brush').addEventListener('click', () => {
      canvasManager.setTool('brush');
      document.getElementById('tool-brush').classList.add('active');
      document.getElementById('tool-eraser').classList.remove('active');
    });
    
    document.getElementById('tool-eraser').addEventListener('click', () => {
      canvasManager.setTool('eraser');
      document.getElementById('tool-eraser').classList.add('active');
      document.getElementById('tool-brush').classList.remove('active');
    });
    

    const colorPicker = document.getElementById('color-picker');
    colorPicker.addEventListener('input', (e) => {
      canvasManager.setColor(e.target.value);
      updateColorPresets(e.target.value);
    });
    
  
    document.querySelectorAll('.color-preset').forEach(preset => {
      preset.addEventListener('click', () => {
        const color = preset.dataset.color;
        canvasManager.setColor(color);
        colorPicker.value = color;
        updateColorPresets(color);
      });
    });
    
    
    const brushSize = document.getElementById('brush-size');
    const brushSizeDisplay = document.getElementById('brush-size-display');
    brushSize.addEventListener('input', (e) => {
      const size = parseInt(e.target.value);
      canvasManager.setLineWidth(size);
      brushSizeDisplay.textContent = size;
    });
    
    
    document.getElementById('undo-btn').addEventListener('click', () => {
      webSocketManager.undo();
    });
    
    document.getElementById('redo-btn').addEventListener('click', () => {
      webSocketManager.redo();
    });
    

    document.getElementById('clear-btn').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the canvas?')) {
        canvasManager.clearCanvas();
        webSocketManager.clearCanvas();
      }
    });
  }

  function updateColorPresets(selectedColor) {
    document.querySelectorAll('.color-preset').forEach(preset => {
      if (preset.dataset.color === selectedColor) {
        preset.classList.add('active');
      } else {
        preset.classList.remove('active');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();







