## Architecture (plain English)

This project is a simple real-time drawing board. Multiple people open the same page and draw together. The web browser clients talk to a Node.js server using WebSockets (socket.io). The server keeps a canonical list of drawing operations and forwards updates to everyone in the same room.

Below is a short, human-friendly explanation of the main pieces and how they work together.

### Main parts

- Client (browser)
  - Renders two canvas layers: one for drawings, and one for cursors/overlays.
  - Captures mouse/touch events, draws locally for instant feedback, and sends drawing events to the server.
  - Keeps a local copy of operations so it can incrementally draw and also redraw the full canvas when needed.

- Server (Node.js + socket.io)
  - Serves the static client files and accepts WebSocket connections.
  - Keeps room membership (who is in which room) and a drawing state per room.
  - Assigns operation IDs and broadcasts events to everyone in a room.

- DrawingState (server-side module)
  - Holds an ordered list of drawing operations (strokes, erases) for each room.
  - Supports undo/redo per user by marking operations with an `undone` flag and tracking per-user stacks.

### How a drawing action flows (simple)

1. You press down and move the mouse. The client draws locally immediately.
2. The client emits `draw-start` with initial point and metadata (tool, color, width).
3. As you move, the client batches points and emits `draw-point` messages.
4. When you lift the mouse, the client emits `draw-end`.
5. The server creates/stores the operation, assigns an ID, and sends that ID back (`draw-start-ack`).
6. The server broadcasts the operation and subsequent points to other clients in the same room so they can render it.

This keeps things fast for the user (local optimistic drawing) while the server stays authoritative for the final state.

### Events (short summary)

- Client → Server: `join-room`, `draw-start`, `draw-point`, `draw-end`, `cursor-move`, `undo`, `redo`, `clear-canvas`.
- Server → Client: `canvas-state` (full sync), `draw-start-ack`, `draw-start`, `draw-point`, `draw-end`, `cursor-move`, `undo-operation`, `redo-operation`, `canvas-cleared`, `users-updated`, `user-joined`, `user-left`.

`canvas-state` is used when a user joins or when the server wants to force a full sync (for example after undo/redo), while the other events are incremental for real-time responsiveness.

### Undo / Redo (how it works, simply)

- Each finished stroke is an operation stored on the server.
- When a user clicks Undo, the client sends `undo` to the server.
- The server finds that user's last finalized operation, sets `undone = true`, records it on the user's undo stack, and broadcasts `undo-operation` (or a full `canvas-state`) to everyone.
- Redo pops from the user's undo stack and flips `undone = false`, then broadcasts the change.

Important note: undo/redo is tracked per-user (so you undo your own actions). The canvas itself is global and reflects the `undone` flags when drawing.

### Performance and practical decisions

- We draw locally immediately and send events to the server so drawing feels instant.
- To reduce bandwidth, the client batches points (not every single pixel movement gets sent).
- The server periodically emits `canvas-state` (a full state) to catch missed messages and keep everyone synchronized.
- All operations are currently kept in memory on the server. For long-running rooms you might want to cap history or persist to a database.

### Conflicts and latency

- If two people draw over the same area, both strokes are kept and layered by time; there is no destructive merge.
- Clients show optimistic local updates; the server is authoritative and will eventually ensure every client has the same final state.

### Quick troubleshooting (human-friendly)

- If the page doesn't connect: make sure the server is running (`npm start`), and open the site at `http://localhost:3000`.
- If you open the `index.html` file directly with `file://` it won't work — the client must be served by the Node server for socket.io to load.
- If the port 3000 is already in use, start with a different port: `PORT=4000 npm start` (Windows PowerShell: `$env:PORT = 4000; npm start`).
- If you see inconsistent drawings after undo/redo, try clicking the undo/redo buttons again or ask the client to request a full sync (`request-full-state`).

---

If you want, I can also:
- Add a small diagram image or ASCII art to this file.
- Add a short README section with the same plain-language notes.
- Add localStorage so a user doesn't need to re-enter their name when opening new tabs.

That's the architecture in plain words — short and practical. Let me know if you'd like this trimmed further or expanded into a developer-facing design doc.
1. Server sends all finalized operations via `canvas-state`
2. Client stores operations
3. Client redraws canvas from scratch

### Incremental Updates

During session:
1. New operations arrive via `draw-start`, `draw-point`, `draw-end`
2. Operations incrementally added to canvas
3. No full redraw needed

### Undo/Redo Sync

1. Operation marked as undone/redone
2. All clients receive update
3. All clients redraw canvas (full redraw for consistency)

## Scalability Considerations

### Current Limitations

- **Single Server**: All connections to one Node.js instance
- **Memory**: All operations stored in memory
- **No Persistence**: State lost on restart

### Scaling to 1000 Users

**Proposed Architecture**:

1. **Horizontal Scaling**
   - Multiple server instances
   - Redis for shared state
   - Socket.io Redis adapter for message broadcasting

2. **Operation Compression**
   - Store operations as compressed deltas
   - Limit operation history per room
   - Archive old operations

3. **Room Sharding**
   - Split users across servers by room
   - Load balancer routes by room ID

4. **Optimistic Updates**
   - Client-side prediction
   - Server reconciliation
   - Conflict resolution

5. **Database Persistence**
   - Store operations in database
   - Periodic snapshots
   - Lazy loading for history

## Security Considerations

**Current Implementation**: No authentication
**Production Considerations**:
- User authentication
- Rate limiting (prevent spam)
- Input validation (prevent malicious data)
- CORS configuration
- HTTPS/WSS for secure connections

## Code Organization

### Separation of Concerns

- **`canvas.js`**: Pure canvas drawing logic, no network code
- **`websocket.js`**: Pure WebSocket communication, no canvas logic
- **`main.js`**: UI initialization and event binding
- **`server.js`**: HTTP/WebSocket server setup
- **`rooms.js`**: Room and user management
- **`drawing-state.js`**: Operation history and undo/redo logic

### Design Patterns Used

1. **Manager Pattern**: `CanvasManager`, `WebSocketManager` encapsulate functionality
2. **State Pattern**: `DrawingState` manages operation state
3. **Observer Pattern**: WebSocket events notify clients of changes
4. **Singleton Pattern**: Single server instance manages all rooms

## Testing Strategy

### Manual Testing
- Multiple browser tabs
- Different browsers
- Network latency simulation (Chrome DevTools)
- Mobile devices

### Potential Automated Tests
- Unit tests for `DrawingState` operations
- Integration tests for WebSocket events
- Canvas rendering tests
- Undo/redo logic tests

## Future Improvements

1. **Operation Compression**: Reduce network payload
2. **Delta Syncing**: Only send changes since last sync
3. **Operation Batching**: Batch multiple operations into single message
4. **Canvas Layers**: Support multiple drawing layers
5. **Performance Metrics**: FPS counter, latency display
6. **Drawing Tools**: Shapes, text, images
7. **Persistence**: Save/load sessions
8. **Version History**: Time-travel through drawing history

---

**Document Version**: 1.0  
**Last Updated**: 2024



