# Real-Time Collaborative Drawing Canvas

A multi-user drawing application where multiple people can draw simultaneously on the same canvas with real-time synchronization.

## Features
-Brush and eraser with customizable colors and stroke widths
-See other users' drawings as they draw (not after they finish)
-Visual indicators showing where other users are currently drawing
-Undo and redo operations work across all users
-See who's online with color-coded user indicators
-Touch support for drawing on mobile devices



## Setup Instructions



- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation
1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:

npm install
npm start



4. Open your browser and navigate to:

```
http://localhost:3000
```

5. Enter your name when prompted

6. Start drawing!



## Testing with Multiple Users

1. Local Testing: Open multiple browser tabs/windows and navigate to `http://localhost:3000` in each

2. Network Testing: 
   - Find your local IP address (e.g., `ipconfig` on Windows, `ifconfig` on Mac/Linux)
   - Other devices on the same network can access: `http://YOUR_IP:3000`





## Known Limitations

1. Canvas Persistence: Drawings are not persisted between server restarts
2. Room System: Currently uses a single default room (room system architecture is in place but not exposed in UI)
3. Network Latency: High latency may cause slight delays in drawing synchronization
4. Browser Compatibility: Requires modern browsers with Canvas and WebSocket support
5. Mobile Performance: Performance may degrade on older mobile devices with many simultaneous users



## Time Spent

Approximately 8-10 hours including:
- Architecture design and planning
- Server-side WebSocket implementation
- Client-side canvas drawing logic
- Real-time synchronization
- Global undo/redo system
- UI/UX implementation
- Testing and debugging
- Documentation










