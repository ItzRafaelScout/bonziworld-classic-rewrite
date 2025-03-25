const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Store active rooms and users
const rooms = new Map();
const users = new Map();

// Create a default public room
rooms.set('public', {
    id: 'public',
    name: 'Public Room',
    private: false,
    owner: null,
    users: new Set()
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Handle user login
    socket.on('login', (data) => {
        // Generate a unique ID for the user
        const guid = uuidv4();
        
        // Default to public room if none specified
        const roomId = data.room || 'public';
        
        // Create room if it doesn't exist
        if (!rooms.has(roomId) && roomId !== 'public') {
            rooms.set(roomId, {
                id: roomId,
                name: roomId,
                private: true,
                owner: guid,
                users: new Set()
            });
        }
        
        const room = rooms.get(roomId);
        
        // Add user to the room
        room.users.add(guid);
        
        // Join the socket room
        socket.join(roomId);
        
        // Create user data
        const userData = {
            guid: guid,
            name: data.name || 'Anonymous',
            room: roomId,
            color: getRandomColor(),
            owner: room.owner === guid
        };
        
        // Store user data
        users.set(guid, {
            ...userData,
            socketId: socket.id
        });
        
        // Associate socket with user ID
        socket.userId = guid;
        
        // Send login confirmation
        socket.emit('login', {
            ...userData,
            roompriv: room.private
        });
        
        // Notify room about new user
        io.to(roomId).emit('join', userData);
        
        // Send existing users to the new user
        room.users.forEach(userId => {
            if (userId !== guid) {
                const user = users.get(userId);
                if (user) {
                    socket.emit('join', {
                        guid: userId,
                        name: user.name,
                        color: user.color
                    });
                }
            }
        });
    });
    
    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        const userId = socket.userId;
        if (!userId || !users.has(userId)) return;
        
        const user = users.get(userId);
        const roomId = user.room;
        
        if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            
            // Remove user from room
            room.users.delete(userId);
            
            // Notify room about user leaving
            io.to(roomId).emit('leave', { guid: userId });
            
            // Clean up empty rooms (except public)
            if (room.users.size === 0 && roomId !== 'public') {
                rooms.delete(roomId);
            }
            // Transfer ownership if owner leaves
            else if (room.owner === userId) {
                const newOwner = Array.from(room.users)[0];
                if (newOwner) {
                    room.owner = newOwner;
                    const ownerUser = users.get(newOwner);
                    if (ownerUser) {
                        io.to(ownerUser.socketId).emit('update', {
                            guid: newOwner,
                            owner: true
                        });
                    }
                }
            }
        }
        
        // Remove user data
        users.delete(userId);
    });
    
    // Handle user chat messages
    socket.on('talk', (data) => {
        const userId = socket.userId;
        if (!userId || !users.has(userId)) return;
        
        const user = users.get(userId);
        
        io.to(user.room).emit('talk', {
            guid: userId,
            text: data.text
        });
    });
});

// Helper function to get a random Bonzi color
function getRandomColor() {
    const colors = ['black', 'blue', 'brown', 'green', 'purple', 'red'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 
