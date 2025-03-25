# BonziWorld Classic Rewrite

A rewrite of the classic BonziWorld chat application. This project features animated Bonzi characters in a chat room environment, inspired by the classic Microsoft Agent character.

## Features

- Login system with room support
- Public and private rooms
- Chat functionality
- Animated Bonzi buddies with different colors
- Room ownership system

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. For development with auto-restart:
   ```bash
   npm run dev
   ```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Enter your name and optionally a room ID
3. If you leave the room ID blank, you'll join the public room
4. If you enter a room ID that doesn't exist, you'll create a new private room and become its owner
5. Chat with other users in the room by typing messages and clicking "SEND" or pressing Enter

## Technologies Used

- HTML5, CSS3, JavaScript
- Socket.IO for real-time communication
- Express.js for the web server
- CreateJS for sprite animations

## Project Structure

- `public/` - Static files (HTML, CSS, JavaScript, images)
- `public/css/style.css` - Main CSS styles
- `public/js/app.js` - Client-side JavaScript
- `server.js` - Server-side code with Socket.IO implementation

## Status

This is an experimental rewrite labeled "EXPERIMENTAL" and is in development. 
