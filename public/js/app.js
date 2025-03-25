// Helper function to get an element by ID
function $(id) {
    return document.getElementById(id);
}

// Helper function to generate a range of numbers
function range(start, end) {
    const arr = [];
    for (let i = start; i <= end; i++) {
        arr.push(i);
    }
    return arr;
}

// Connect to Socket.io server
const socket = io('/');

// Login form elements
const loginNameInput = $('login_name');
const loginRoomInput = $('login_room');
const loginGoButton = $('login_go');
const loginErrorElement = $('login_error');
const loginLoadElement = $('login_load');

// Main content elements
const pageLogin = $('page_login');
const content = $('content');
const bonziCanvas = $('bonzi-canvas');
const roomIdElement = $('room_id');
const roomPrivElement = $('room_priv');
const roomOwnerElement = $('room_owner');
const chatMessageInput = $('chat_message');
const chatSendButton = $('chat_send');

// Available Bonzi colors
const BONZI_COLORS = ['black', 'blue', 'brown', 'green', 'purple', 'red'];

// Global variable to store login data
let loginData = {};

// Map to store all bonzis
const bonzis = new Map();

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Hide loading text when everything is loaded
    loginLoadElement.style.display = 'none';

    // Set up login form
    loginGoButton.addEventListener('click', handleLogin);
    loginNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    loginRoomInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });

    // Set up chat form
    chatSendButton.addEventListener('click', sendChatMessage);
    chatMessageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });

    // Handle window resize to keep Bonzi characters within bounds
    window.addEventListener('resize', handleWindowResize);

    // Socket event handlers
    socket.on('connect', function() {
        console.log('Connected to server');
    });

    socket.on('disconnect', function() {
        console.log('Disconnected from server');
        // Show login screen if disconnected
        showLoginScreen();
    });

    socket.on('login', function(data) {
        console.log('Login successful', data);
        loginData = data;
        hideLoginScreen();
        updateRoomInfo();
    });

    socket.on('join', function(data) {
        console.log('User joined', data);
        addBonzi(data);
    });

    socket.on('leave', function(data) {
        console.log('User left', data);
        removeBonzi(data.guid);
    });

    socket.on('talk', function(data) {
        console.log('User talking', data);
        bonziTalk(data.guid, data.text);
    });

    socket.on('update', function(data) {
        console.log('User updated', data);
        updateBonzi(data);
    });

    socket.on('actqueue', function(data) {
        console.log('Action queue', data);
        processBonziActionQueue(data.guid, data.queue);
    });
});

// Handle login form submission
function handleLogin() {
    if (!loginNameInput.value) {
        showLoginError('Please enter a name.');
        return;
    }

    // Disable login button while attempting to login
    loginGoButton.style.pointerEvents = 'none';
    
    const loginData = {
        name: loginNameInput.value,
        room: loginRoomInput.value
    };

    console.log('Attempting login with data:', loginData);
    socket.emit('login', loginData);
}

// Show error message on login form
function showLoginError(message) {
    loginErrorElement.textContent = message;
    loginErrorElement.style.display = 'block';
}

// Hide login screen
function hideLoginScreen() {
    document.body.classList.add('blur');
    setTimeout(function() {
        pageLogin.style.display = 'none';
        document.body.classList.remove('blur');
    }, 500);
}

// Show login screen
function showLoginScreen() {
    document.body.classList.add('blur');
    setTimeout(function() {
        pageLogin.style.display = 'block';
        loginGoButton.style.pointerEvents = 'auto';
        document.body.classList.remove('blur');
    }, 500);
}

// Update room information
function updateRoomInfo() {
    roomIdElement.textContent = loginData.room || 'public';
    roomPrivElement.textContent = loginData.roompriv ? 'private' : 'public';
    roomOwnerElement.style.display = loginData.owner ? 'block' : 'none';
}

// Send chat message
function sendChatMessage() {
    if (!chatMessageInput.value) return;
    
    socket.emit('talk', {
        text: chatMessageInput.value
    });
    
    chatMessageInput.value = '';
}

// Add a new Bonzi character
function addBonzi(data) {
    // Create container for the Bonzi
    const bonziContainer = document.createElement('div');
    bonziContainer.id = 'bonzi_' + data.guid;
    bonziContainer.className = 'bonzi';
    
    // Create name tag
    const nameTag = document.createElement('div');
    nameTag.className = 'bonzi_name';
    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'bonzi_username';
    usernameSpan.textContent = data.name;
    const typingIndicator = document.createElement('i');
    typingIndicator.className = 'typing';
    typingIndicator.hidden = true;
    typingIndicator.textContent = '(typing)';
    nameTag.appendChild(usernameSpan);
    nameTag.appendChild(typingIndicator);
    
    // Create placeholder for the Bonzi sprite
    const placeholder = document.createElement('div');
    placeholder.className = 'bonzi_placeholder';
    
    // Create chat bubble
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.style.display = 'none';
    const bubbleContent = document.createElement('p');
    bubbleContent.className = 'bubble-content';
    bubble.appendChild(bubbleContent);
    
    // Add elements to the container
    bonziContainer.appendChild(nameTag);
    bonziContainer.appendChild(placeholder);
    bonziContainer.appendChild(bubble);
    
    // Add the container to the content area
    content.appendChild(bonziContainer);
    
    // Position Bonzi randomly on screen
    const randomX = Math.floor(Math.random() * (window.innerWidth - 200));
    const randomY = Math.floor(Math.random() * (window.innerHeight - 160));
    bonziContainer.style.left = randomX + 'px';
    bonziContainer.style.top = randomY + 'px';
    
    // Set up dragging functionality
    setupBonziDrag(bonziContainer);
    
    // Store Bonzi data
    bonzis.set(data.guid, {
        element: bonziContainer,
        data: data,
        nameTag: nameTag,
        bubble: bubble,
        bubbleContent: bubbleContent,
        placeholder: placeholder
    });
    
    // Initialize Bonzi sprite
    initBonziSprite(data);
    
    // Play join animation
    if (data.guid !== loginData.guid) {
        // Play intro animation for other users
        setTimeout(function() {
            runBonziAnimation(data.guid, 'surf_intro');
        }, 100);
    }
}

// Set up dragging functionality for Bonzi
function setupBonziDrag(element) {
    let isDragging = false;
    let offsetX, offsetY;
    
    element.addEventListener('mousedown', startDrag);
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    function startDrag(e) {
        if (e.target.closest('.bubble')) return; // Don't start drag if clicking inside bubble
        
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
        
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
        
        // Change cursor to grabbing
        element.style.cursor = 'grabbing';
    }
    
    function handleTouchStart(e) {
        if (e.target.closest('.bubble')) return; // Don't start drag if touching inside bubble
        
        e.preventDefault(); // Prevent scrolling when dragging
        isDragging = true;
        const touch = e.touches[0];
        offsetX = touch.clientX - element.getBoundingClientRect().left;
        offsetY = touch.clientY - element.getBoundingClientRect().top;
        
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', stopTouchDrag);
        
        // Change cursor to grabbing
        element.style.cursor = 'grabbing';
    }
    
    function doDrag(e) {
        if (!isDragging) return;
        
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        
        // Keep Bonzi within window bounds
        const maxX = window.innerWidth - element.offsetWidth;
        const maxY = window.innerHeight - element.offsetHeight;
        
        element.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
        element.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    }
    
    function handleTouchMove(e) {
        if (!isDragging) return;
        
        e.preventDefault(); // Prevent scrolling when dragging
        const touch = e.touches[0];
        const x = touch.clientX - offsetX;
        const y = touch.clientY - offsetY;
        
        // Keep Bonzi within window bounds
        const maxX = window.innerWidth - element.offsetWidth;
        const maxY = window.innerHeight - element.offsetHeight;
        
        element.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
        element.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    }
    
    function stopDrag() {
        isDragging = false;
        document.removeEventListener('mousemove', doDrag);
        document.removeEventListener('mouseup', stopDrag);
        
        // Reset cursor
        element.style.cursor = 'grab';
    }
    
    function stopTouchDrag() {
        isDragging = false;
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', stopTouchDrag);
        
        // Reset cursor
        element.style.cursor = 'grab';
    }
}

// Initialize Bonzi sprite with createjs
function initBonziSprite(data) {
    const color = data.color || BONZI_COLORS[Math.floor(Math.random() * BONZI_COLORS.length)];
    
    // Get the bonzi container
    const bonziContainer = $('bonzi_' + data.guid);
    const bonziPlaceholder = bonziContainer.querySelector('.bonzi_placeholder');
    
    // Create sprite sheet with animations
    const spriteSheet = new createjs.SpriteSheet({
        images: ["./img/bonzi/" + color + ".png"],
        frames: { width: 200, height: 160 },
        animations: {
            idle: 0,
            surf_intro: { 
                frames: range(277, 302), 
                next: "idle",
                speed: 0.5 
            },
            surf_away: { 
                frames: range(16, 38), 
                next: "gone",
                speed: 0.5 
            },
            gone: 39,
            talk_begin: { 
                frames: [1, 2, 3],
                next: "talk",
                speed: 0.3
            },
            talk: {
                frames: [2, 3, 2, 3, 2, 3, 4, 4, 3, 2, 3, 4, 3, 2, 4, 3, 4],
                next: "talk",
                speed: 0.3
            },
            talk_end: {
                frames: [3, 2, 1, 0],
                next: "idle",
                speed: 0.3
            }
        }
    });
    
    // Create the sprite
    const sprite = new createjs.Sprite(spriteSheet, "idle");
    
    // Create a canvas for the sprite and append it to replace the placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 160;
    bonziContainer.replaceChild(canvas, bonziPlaceholder);
    
    // Setup the stage
    const stage = new createjs.Stage(canvas);
    createjs.Ticker.timingMode = createjs.Ticker.RAF;
    createjs.Ticker.addEventListener("tick", stage);
    
    // Add sprite to stage
    stage.addChild(sprite);
    stage.update();
    
    // Store sprite and stage in bonzi data
    bonzis.get(data.guid).sprite = sprite;
    bonzis.get(data.guid).stage = stage;
    bonzis.get(data.guid).canvas = canvas;
    bonzis.get(data.guid).color = color;
    
    console.log(`Initialized Bonzi sprite with color: ${color}`);
    
    // Play intro animation for newly joined bonzis
    if (data.guid !== loginData.guid) {
        sprite.gotoAndPlay("surf_intro");
    }
}

// Remove a Bonzi character
function removeBonzi(guid) {
    const bonzi = bonzis.get(guid);
    if (!bonzi) return;
    
    // Play leave animation
    runBonziAnimation(guid, 'surf_away');
    
    // Remove element after animation
    setTimeout(function() {
        bonzi.element.remove();
        bonzis.delete(guid);
    }, 1500);
}

// Update a Bonzi's information
function updateBonzi(data) {
    const bonzi = bonzis.get(data.guid);
    if (!bonzi) return;
    
    // Update name
    if (data.name) {
        bonzi.nameTag.querySelector('.bonzi_username').textContent = data.name;
    }
    
    // Update other properties as needed
    bonzi.data = {...bonzi.data, ...data};
}

// Run a Bonzi animation
function runBonziAnimation(guid, animation) {
    const bonzi = bonzis.get(guid);
    if (!bonzi || !bonzi.sprite) return;
    
    console.log(`Running animation ${animation} for Bonzi ${guid}`);
    
    // Handle animation transitions
    switch(animation) {
        case 'surf_intro':
            bonzi.sprite.gotoAndPlay("surf_intro");
            break;
            
        case 'surf_away':
            bonzi.sprite.gotoAndPlay("surf_away");
            break;
            
        case 'talk':
            // If already talking, continue talking
            if (bonzi.sprite.currentAnimation === "talk") {
                return;
            }
            
            // Start talk animation
            bonzi.sprite.gotoAndPlay("talk_begin");
            
            // Set a flag to track talking state
            bonzi.talking = true;
            break;
            
        case 'idle':
            // If currently talking, end talk animation first
            if (bonzi.talking) {
                bonzi.sprite.gotoAndPlay("talk_end");
                bonzi.talking = false;
            } else {
                bonzi.sprite.gotoAndStop("idle");
            }
            break;
            
        default:
            // For any other animations, try to play them directly
            bonzi.sprite.gotoAndPlay(animation);
            break;
    }
    
    // Update the stage
    bonzi.stage.update();
}

// Make a Bonzi talk
function bonziTalk(guid, text) {
    const bonzi = bonzis.get(guid);
    if (!bonzi) return;
    
    // Set bubble content
    bonzi.bubbleContent.textContent = text;
    
    // Show bubble
    bonzi.bubble.style.display = 'block';
    
    // Position bubble correctly (default to right)
    bonzi.bubble.className = 'bubble bubble-right';
    
    // Start talk animation
    runBonziAnimation(guid, 'talk');

    speak.play(text);
    
    // Hide bubble and stop talking after a delay
    const talkTime = Math.max(2000, text.length * 100);
    setTimeout(function() {
        bonzi.bubble.style.display = 'none';
        runBonziAnimation(guid, 'idle');
    }, talkTime);
}

// Process a queue of Bonzi actions
function processBonziActionQueue(guid, queue) {
    if (!queue || !queue.length) return;
    
    const bonzi = bonzis.get(guid);
    if (!bonzi) return;
    
    // Process each action in sequence
    let delay = 0;
    
    queue.forEach(action => {
        setTimeout(function() {
            switch(action.type) {
                case 'anim':
                    runBonziAnimation(guid, action.anim);
                    break;
                case 'text':
                    bonziTalk(guid, action.text);
                    break;
                // Add more action types as needed
            }
        }, delay);
        
        delay += action.duration || 1000;
    });
}

// Handle window resize
function handleWindowResize() {
    // Adjust all Bonzi characters to stay within window bounds
    bonzis.forEach((bonzi, guid) => {
        const element = bonzi.element;
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        
        // Ensure the Bonzi is within bounds
        if (rect.left > maxX) {
            element.style.left = maxX + 'px';
        }
        
        if (rect.top > maxY) {
            element.style.top = maxY + 'px';
        }
    });
} 
