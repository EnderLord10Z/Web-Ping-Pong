const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let ballRadius = 10;

let canvasWidth = 800;
let canvasHeight = 400;

let paddleHeight = 0.2125 * canvasHeight;
let paddleWidth = 0.01875 * canvasWidth;
let paddleGap = 0.01875 * canvasWidth;

let playerPaddleY = (canvasHeight - paddleHeight) / 2;
let computerPaddleY = (canvasHeight - paddleHeight) / 2;
let ballX, ballY; // Ball position will be initialized on game start
let ballSpeedX = -3; // Set initial speed towards player (left side)
let ballSpeedY = 3; // Slower speed for the ball

let playerScore = 0;
let computerScore = 0;
let lastPlayerPaddleY = playerPaddleY; // Track last position of player paddle
let difficulty = 'easy'; // Default difficulty
let customComputerSpeed = 2; // Default speed for custom difficulty

let speedBoostDuration = 2000; // Duration for speed boost in milliseconds
let speedBoostFactor = 1.5; // Factor to increase speed
let speedBoostActive = false; // Flag to check if speed boost is active
let speedBoostStartTime = 0; // Time when speed boost starts

let gameActive = false; // Flag to track if the game is active

let ballTrailEnabled = true; // Flag to enable/disable ball trail
let ballTrail = []; // Array to store recent ball positions for trail
let glowTrail = []; // Array to store recent ball positions for glow trail (longer lasting)
let insideColor = '#000000'; // Default background color for the game canvas
let customBackgroundEnabled = false; // Flag for custom background mode
let backgroundImageUrl = ''; // URL for background image
let imageBackgroundEnabled = false; // Flag for image background mode
let maxBallSpeed = 5; // Default max ball speed

let ledOffset = 0;
let ledTrail = []; // Array for LED trail positions
const numLEDs = 1;
let ledSpeed = 5; // Speed of LED movement (pixels per frame)
const ledSize = 6; // Increased size for better visibility
const ledColor = '#00008B'; // Dark blue for better visibility
const innerOffset = 10; // Offset inside the border
let spinningLEDEnabled = true; // Flag to enable/disable spinning LED

// Consistent speeds for computer paddle based on difficulty
const computerSpeeds = {
    easy: 1.5, // Updated speed for easy mode
    medium: 2, // Increased speed for medium mode
    hard: 3, // Increased speed for hard mode
    custom: customComputerSpeed, // Speed for custom mode
};

function drawRoundedRect(x, y, width, height, radius) {
    // Ensure radius does not exceed half the width or height to prevent inward curves
    radius = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

function updateScore() {
    ctx.fillStyle = '#fff';
    const fontSize = Math.max(16, Math.min(30, canvas.width / 40));
    ctx.font = `${fontSize}px Arial`;
    ctx.shadowColor = '#00ffff'; // Cyan glow for text
    ctx.shadowBlur = 10;
    const difficultyLabels = {
        easy: 'AI - Easy',
        medium: 'AI - Medium',
        hard: 'AI - Hard',
        impossible: 'AI - Impossible',
        custom: 'AI - Custom',
    };
    ctx.textAlign = 'left';
    if (difficulty === 'disable') {
        ctx.fillText(`Player1: ${playerScore}`, 10, 20);
        ctx.textAlign = 'right';
        ctx.fillText(`Player2: ${computerScore}`, canvas.width - 10, 20);
    } else {
        const label = difficultyLabels[difficulty] || 'AI';
        ctx.fillText(`Player: ${playerScore}`, 10, 20);
        ctx.textAlign = 'right';
        ctx.fillText(`${label}: ${computerScore}`, canvas.width - 10, 20);
    }
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.textAlign = 'left'; // Reset to default
}

function displayWinner(winner) {
    alert(`${winner} wins!`);
    location.reload();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    const winnerFontSize = Math.max(30, Math.min(50, canvas.width / 16));
    ctx.font = `${winnerFontSize}px Arial`;
    ctx.shadowColor = '#00ffff'; // Cyan glow for text
    ctx.shadowBlur = 20;
    ctx.textAlign = 'center';
    ctx.fillText(`${winner} wins!`, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.textAlign = 'left';

    // Reset game state and show main menu
    document.getElementById('startButton').style.display = 'block'; // Show start button
    document.getElementById('difficulty').disabled = false; // Enable difficulty selection

    document.getElementById('menu').style.display = 'block'; // Show the main menu
    const menuMusic = document.getElementById('menuMusic');
    if (menuMusic) menuMusic.play();
    const gameMusic = document.getElementById('gameMusic');
    if (gameMusic) {
        gameMusic.pause();
        console.log('Game music paused');
    }
    document.getElementById('gameCanvas').style.display = 'none'; // Hide the game canvas
    playerScore = 0; // Reset player score
    computerScore = 0; // Reset computer score
    gameActive = false; // Reset game active flag

    // Show settings button after game ends
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
        settingsButton.style.display = 'block';
    }
}

function draw() {
    // Always clear the canvas to prevent smearing of glow effects
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Handle background color if custom background is enabled
    if (customBackgroundEnabled) {
        ctx.fillStyle = insideColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Handle background image if image background is enabled
    if (imageBackgroundEnabled && backgroundImageUrl) {
        // Create a temporary image to test if URL is valid
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = backgroundImageUrl;
    }

    // Draw glowing border around the game canvas
    ctx.save();
    ctx.shadowColor = '#00ffff'; // Cyan glow for border
    ctx.shadowBlur = 20;
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#00ffff';
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw spinning LED strip inside the border
    if (spinningLEDEnabled) {
        ctx.save();
        ctx.shadowColor = ledColor;
        ctx.shadowBlur = 15;
        const perimeter = 2 * (canvas.width + canvas.height - 4 * innerOffset); // Inner perimeter
        ledOffset = (ledOffset + ledSpeed) % perimeter;
        for (let i = 0; i < numLEDs; i++) {
            const dist = (i / numLEDs) * perimeter + ledOffset;
            let x, y;
            if (dist < canvas.width - 2 * innerOffset) { // Top side (inner)
                x = innerOffset + dist;
                y = innerOffset;
            } else if (dist < canvas.width - 2 * innerOffset + canvas.height - 2 * innerOffset) { // Right side (inner)
                x = canvas.width - innerOffset;
                y = innerOffset + (dist - (canvas.width - 2 * innerOffset));
            } else if (dist < 2 * (canvas.width - 2 * innerOffset) + canvas.height - 2 * innerOffset) { // Bottom side (inner)
                x = canvas.width - innerOffset - (dist - (canvas.width - 2 * innerOffset + canvas.height - 2 * innerOffset));
                y = canvas.height - innerOffset;
            } else { // Left side (inner)
                x = innerOffset;
                y = canvas.height - innerOffset - (dist - (2 * (canvas.width - 2 * innerOffset) + canvas.height - 2 * innerOffset));
            }

            // Add current LED position to trail
            ledTrail.push({x: x, y: y});
            if (ledTrail.length > 15) {
                ledTrail.shift(); // Keep trail length manageable
            }

            // Draw LED trail (glowing, fading)
            for (let j = 0; j < ledTrail.length; j++) {
                const pos = ledTrail[j];
                const fadeFactor = (j / ledTrail.length); // Fade from recent to old
                const alpha = fadeFactor * 0.5; // Max alpha 0.5 for more prominent
                const trailSize = ballRadius; // Same size as the ball
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, trailSize, 0, Math.PI * 2);
                ctx.fillStyle = hexToRGBA(ledColor, alpha);
                ctx.shadowColor = ledColor;
                ctx.shadowBlur = 30; // Stronger glow
                ctx.fill();
            }
            ctx.shadowBlur = 15; // Reset for LED
            ctx.shadowColor = ledColor;

            // Draw the LED itself
            ctx.beginPath();
            ctx.arc(x, y, ledSize, 0, Math.PI * 2);
            ctx.fillStyle = ledColor;
            ctx.fill();
        }
        ctx.restore();
    }

    // Draw paddles with gap and glow
    const paddleColor = document.getElementById('paddleColor') ? document.getElementById('paddleColor').value : '#fff'; // Get selected paddle color (RGB)

    // Player paddle glow
    ctx.shadowColor = paddleColor;
    ctx.shadowBlur = 20;
    ctx.fillStyle = paddleColor; // Use selected color for paddle
    drawRoundedRect(paddleGap, playerPaddleY, paddleWidth, paddleHeight, Math.min(10, Math.min(paddleWidth, paddleHeight) / 2)); // Player paddle with rounded corners

    // Computer paddle glow
    const computerPaddleColor = document.getElementById('paddleColor') ? document.getElementById('paddleColor').value : '#fff'; // Use paddle color for computer paddle
    ctx.shadowColor = computerPaddleColor;
    ctx.shadowBlur = 20;
    ctx.fillStyle = computerPaddleColor; // Use selected color for computer paddle
    drawRoundedRect(canvas.width - paddleWidth - paddleGap, computerPaddleY, paddleWidth, paddleHeight, Math.min(10, Math.min(paddleWidth, paddleHeight) / 2)); // Computer paddle with rounded corners

    // Reset shadow for other drawings
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Draw ball trail if enabled
    if (ballTrailEnabled) {
        const selectedBallColor = document.getElementById('ballColor') ? document.getElementById('ballColor').value : '#ff0000';
        for (let i = 0; i < ballTrail.length; i++) {
            const pos = ballTrail[i];
            // Alpha and size decrease the farther the trail is
            const alpha = (i / ballTrail.length) * 0.5; // transparency decreases (fade out)
            const size = ballRadius * (i / ballTrail.length); // size decreases (fade out)
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fillStyle = hexToRGBA(selectedBallColor, alpha);
            ctx.fill();
        }
        // Draw glow trail (longer lasting, transparent)
        for (let i = 0; i < glowTrail.length; i++) {
            const pos = glowTrail[i];
            // Calculate fade factor based on position in trail for slow fade
            const fadeFactor = Math.pow(i / glowTrail.length, 2);
            const alpha = fadeFactor * 0.15; // More transparent and longer lasting with slow fade (fade out)
            const size = ballRadius * 0.8; // Thinner size for glow trail than the ball
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fillStyle = hexToRGBA(selectedBallColor, alpha);
            ctx.shadowColor = selectedBallColor;
            ctx.shadowBlur = 25;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        }
    }

    // Draw ball only if it has been initialized and the game is ongoing
    if (canSpawnBall() && ballX !== undefined && ballY !== undefined) {
        const selectedBallColor = document.getElementById('ballColor') ? document.getElementById('ballColor').value : '#ff0000'; // Get selected ball color (RGB)
        ctx.shadowColor = selectedBallColor;
        ctx.shadowBlur = 55;  // Increased glow intensity for stronger glow effect
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = selectedBallColor; // Use selected color for ball
        ctx.fill();
        ctx.shadowBlur = 20; // Apply same glow effect as paddles
        ctx.shadowColor = selectedBallColor;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // Move ball
        ballX += ballSpeedX;
        ballY += ballSpeedY;

        // Add current ball position to trail
        if (ballTrailEnabled) {
            ballTrail.push({x: ballX, y: ballY});
            glowTrail.push({x: ballX, y: ballY}); // Add to glow trail as well
            if (ballTrail.length > 30) {
                ballTrail.shift(); // Keep trail length manageable
            }
            if (glowTrail.length > 80) {
                glowTrail.shift(); // Keep glow trail longer but manageable
            }
        } else {
            ballTrail = [];
            glowTrail = [];
        }

        // Ball collision with top and bottom
        if (ballY + ballRadius > canvas.height || ballY - ballRadius < 0) {
            ballSpeedY = -ballSpeedY;
        }

        // Ball collision with paddles
        if (ballX - ballRadius < paddleWidth + paddleGap && ballY + ballRadius > playerPaddleY && ballY - ballRadius < playerPaddleY + paddleHeight) {
            // Check if the ball is moving towards the paddle
            if (ballSpeedX < 0 && ballY + ballRadius > playerPaddleY && ballY - ballRadius < playerPaddleY + paddleHeight) {

                // Calculate paddle speed

                const paddleSpeed = Math.abs(playerPaddleY - lastPlayerPaddleY);

                ballSpeedX = -ballSpeedX; // Reverse direction

                // Calculate relative hit position on paddle

                const paddleCenterY = playerPaddleY + paddleHeight / 2;

                const relativeHit = ballY - paddleCenterY;

                ballSpeedY = relativeHit * 0.1; // Adjust ball speed based on hit position

                // Ensure minimum speed

                if (Math.abs(ballSpeedY) < 1) {

                    ballSpeedY = Math.sign(ballSpeedY) * 1;

                }

                // Activate speed boost

                if (!speedBoostActive) {

                    speedBoostActive = true;

                    speedBoostStartTime = Date.now();

                    ballSpeedX *= speedBoostFactor; // Increase ball speed

                    ballSpeedY *= speedBoostFactor; // Increase ball speed

                }

            }
        } else if (ballX - ballRadius < 0) {
            // Check for scoring
            computerScore++;
            checkWinner();
            resetBall();
        }

        if (ballX + ballRadius > canvas.width - paddleWidth - paddleGap && ballY + ballRadius > computerPaddleY && ballY - ballRadius < computerPaddleY + paddleHeight) {
            // Check if the ball is moving towards the paddle
            if (ballSpeedX > 0 && ballY + ballRadius > computerPaddleY && ballY - ballRadius < computerPaddleY + paddleHeight) {

                ballSpeedX = -ballSpeedX; // Reverse direction

                // Calculate relative hit position on paddle

                const paddleCenterY = computerPaddleY + paddleHeight / 2;

                const relativeHit = ballY - paddleCenterY;

                ballSpeedY = relativeHit * 0.1; // Adjust ball speed based on hit position

                // Ensure minimum speed

                if (Math.abs(ballSpeedY) < 1) {

                    ballSpeedY = Math.sign(ballSpeedY) * 1;

                }

            }
        }
            if (ballX + ballRadius > canvas.width) {
                // Check for scoring
                playerScore++;
                checkWinner();
                resetBall();
            }

        // AI for computer paddle
        let computerSpeed; // Variable to hold computer paddle speed based on difficulty

        if (difficulty === 'disable') {
            computerSpeed = 0; // Disable computer paddle
        } else {
            if (difficulty === 'impossible') {
                computerSpeed = 10; // Set computer speed to 10 for Impossible difficulty
            } else {
                computerSpeed = difficulty === 'custom' ? customComputerSpeed : computerSpeeds[difficulty]; // Set computer paddle speed based on difficulty
            }

            customComputerSpeed = parseFloat(document.getElementById('customSpeed').value); // Update custom speed from input
        }

        const responseDelay = difficulty === 'easy' ? 200 : difficulty === 'medium' ? 100 : difficulty === 'hard' ? 50 : 0; // Increased delay in milliseconds based on difficulty

        setTimeout(() => {
            // Move computer paddle towards the ball at a consistent speed
            if (ballY > computerPaddleY + paddleHeight / 2) {
                computerPaddleY += computerSpeed; // Move down at consistent speed
            } else {
                computerPaddleY -= computerSpeed; // Move up at consistent speed
            }
        }, responseDelay);

        // Keep computer paddle within bounds
        computerPaddleY = Math.max(0, Math.min(computerPaddleY, canvas.height - paddleHeight));

        // Check if speed boost duration has passed
        if (speedBoostActive && (Date.now() - speedBoostStartTime > speedBoostDuration)) {
            speedBoostActive = false;
            ballSpeedX /= speedBoostFactor; // Reset ball speed
            ballSpeedY /= speedBoostFactor; // Reset ball speed
        }

        // Clamp ball speeds to maxBallSpeed
        ballSpeedX = Math.sign(ballSpeedX) * Math.min(Math.abs(ballSpeedX), maxBallSpeed);
        ballSpeedY = Math.sign(ballSpeedY) * Math.min(Math.abs(ballSpeedY), maxBallSpeed);
    }

    const paddleSpeed = parseFloat(document.getElementById('paddleSpeed').value); // Get paddle speed from slider and convert to number
    if (wPressed) {
        playerPaddleY = Math.max(0, playerPaddleY - paddleSpeed); // Move player paddle up
    }
    if (sPressed) {
        playerPaddleY = Math.min(canvas.height - paddleHeight, playerPaddleY + paddleSpeed); // Move player paddle down
    }

    // Control computer paddle with arrow keys when "Disable PC" is selected
    if (difficulty === 'disable') {
        if (upPressed) {
            computerPaddleY = Math.max(0, computerPaddleY - paddleSpeed); // Move computer paddle up
        }
        if (downPressed) {
            computerPaddleY = Math.min(canvas.height - paddleHeight, computerPaddleY + paddleSpeed); // Move computer paddle down
        }
    }

    updateScore();

    requestAnimationFrame(draw);
}

// Helper function to convert hex color to rgba with alpha
function hexToRGBA(hex, alpha) {
    let r = 0, g = 0, b = 0;

    // 3 digits
    if (hex.length == 4) {
        r = "0x" + hex[1] + hex[1];
        g = "0x" + hex[2] + hex[2];
        b = "0x" + hex[3] + hex[3];

    // 6 digits
    } else if (hex.length == 7) {
        r = "0x" + hex[1] + hex[2];
        g = "0x" + hex[3] + hex[4];
        b = "0x" + hex[5] + hex[6];
    }
    return "rgba("+ +r + "," + +g + "," + +b + "," + alpha + ")";
}

function checkWinner() {
    if (!gameActive) return; // Prevent alerts when in main menu

    if (playerScore >= 20) {
        displayWinner("Player");
        resetBall(); // Reset ball when player wins
        return;
    }
    if (computerScore >= 20) {
        displayWinner("Computer");
        resetBall(); // Reset ball when computer wins
        return;
    }
}

function resetBall() {
    ballX = canvas.width / 2; // Set ball to center
    ballY = canvas.height / 2; // Set ball to center

    const initialSpeed = (canvas.width / 800) * 3;
    ballSpeedX = (Math.random() > 0.5 ? initialSpeed : -initialSpeed); // Random horizontal direction
    ballSpeedY = (Math.random() - 0.5) * (initialSpeed * 2); // Random vertical direction between -3 and 3

    // Clamp initial speeds to maxBallSpeed
    ballSpeedX = Math.sign(ballSpeedX) * Math.min(Math.abs(ballSpeedX), maxBallSpeed);
    ballSpeedY = Math.sign(ballSpeedY) * Math.min(Math.abs(ballSpeedY), maxBallSpeed);
}

function canSpawnBall() {
    return playerScore < 20 && computerScore < 20; // Ball can spawn only if no one has won
}

function fadeIn(audio, duration = 1000, targetVolume = 1) {
    audio.volume = 0;
    audio.play();
    const steps = 20;
    const stepTime = duration / steps;
    const stepVolume = targetVolume / steps;
    let currentStep = 0;
    const interval = setInterval(() => {
        currentStep++;
        audio.volume = Math.min(targetVolume, audio.volume + stepVolume);
        if (currentStep >= steps) {
            clearInterval(interval);
        }
    }, stepTime);
}

function fadeOut(audio, duration = 1000) {
    const steps = 20;
    const stepTime = duration / steps;
    const stepVolume = audio.volume / steps;
    const interval = setInterval(() => {
        audio.volume = Math.max(0, audio.volume - stepVolume);
        if (audio.volume <= 0) {
            audio.pause();
            clearInterval(interval);
        }
    }, stepTime);
}

window.addEventListener('load', () => {
    // Load settings from localStorage
    difficulty = localStorage.getItem('difficulty') || 'easy';
    const storedBallTrail = localStorage.getItem('ballTrailEnabled');
    ballTrailEnabled = storedBallTrail !== null ? storedBallTrail === 'true' : true;
    const storedSpinningLED = localStorage.getItem('spinningLEDEnabled');
    spinningLEDEnabled = storedSpinningLED !== null ? storedSpinningLED === 'true' : true;
    maxBallSpeed = parseFloat(localStorage.getItem('maxBallSpeed')) || 5;
    customComputerSpeed = parseFloat(localStorage.getItem('customComputerSpeed')) || 2;
    paddleSpeed = parseFloat(localStorage.getItem('paddleSpeed')) || 5;
    paddleColor = localStorage.getItem('paddleColor') || '#ffffff';
    ballColor = localStorage.getItem('ballColor') || '#ff0000';
    const storedCustomBg = localStorage.getItem('customBackgroundEnabled');
    customBackgroundEnabled = storedCustomBg !== null ? storedCustomBg === 'true' : false;
    insideColor = localStorage.getItem('insideColor') || '#000000';
    backgroundImageUrl = localStorage.getItem('backgroundImageUrl') || '';
    const storedImageBg = localStorage.getItem('imageBackgroundEnabled');
    imageBackgroundEnabled = storedImageBg !== null ? storedImageBg === 'true' : false;
    canvasWidth = parseInt(localStorage.getItem('canvasWidth')) || 800;
    canvasHeight = parseInt(localStorage.getItem('canvasHeight')) || 400;

    // Set UI from loaded settings
    let difficultySelect = document.getElementById('difficulty');
    if (difficultySelect) difficultySelect.value = difficulty;
    let ballTrailCheckbox = document.getElementById('ballTrail');
    if (ballTrailCheckbox) ballTrailCheckbox.checked = ballTrailEnabled;
    let spinningLEDCheckbox = document.getElementById('spinningLED');
    if (spinningLEDCheckbox) spinningLEDCheckbox.checked = spinningLEDEnabled;
    let maxBallSpeedSlider = document.getElementById('maxBallSpeed');
    if (maxBallSpeedSlider) maxBallSpeedSlider.value = maxBallSpeed;
    let paddleSpeedSlider = document.getElementById('paddleSpeed');
    if (paddleSpeedSlider) paddleSpeedSlider.value = paddleSpeed;
    let paddleColorInput = document.getElementById('paddleColor');
    if (paddleColorInput) paddleColorInput.value = paddleColor;
    let ballColorInput = document.getElementById('ballColor');
    if (ballColorInput) ballColorInput.value = ballColor;
    let customBackgroundCheckbox = document.getElementById('coloredBackground');
    if (customBackgroundCheckbox) customBackgroundCheckbox.checked = customBackgroundEnabled;
    let insideColorInput = document.getElementById('insideColor');
    if (insideColorInput) insideColorInput.value = insideColor;
    let canvasWidthSlider = document.getElementById('canvasWidth');
    if (canvasWidthSlider) canvasWidthSlider.value = canvasWidth;
    let canvasHeightSlider = document.getElementById('canvasHeight');
    if (canvasHeightSlider) canvasHeightSlider.value = canvasHeight;
    let musicVolumeSlider = document.getElementById('musicVolume');
    if (musicVolumeSlider) {
        const savedVolume = localStorage.getItem('musicVolume');
        if (savedVolume) musicVolumeSlider.value = savedVolume;
    }

    console.log('Page loaded successfully');

    // Get element references
    difficultySelect = document.getElementById('difficulty');
    ballTrailCheckbox = document.getElementById('ballTrail');
    maxBallSpeedSlider = document.getElementById('maxBallSpeed');
    paddleSpeedSlider = document.getElementById('paddleSpeed');
    paddleColorInput = document.getElementById('paddleColor');
    ballColorInput = document.getElementById('ballColor');
    customBackgroundCheckbox = document.getElementById('coloredBackground');
    insideColorInput = document.getElementById('insideColor');
    canvasWidthSlider = document.getElementById('canvasWidth');
    canvasHeightSlider = document.getElementById('canvasHeight');
    musicVolumeSlider = document.getElementById('musicVolume');

    // Play music on first mouse move to comply with autoplay policies
    const menuMusic = document.getElementById('menuMusic');
    const gameMusic = document.getElementById('gameMusic');
    if (menuMusic) menuMusic.volume = 0.5;
    if (gameMusic) gameMusic.volume = 0.5;
    window.addEventListener('mousemove', (event) => {
        if (menuMusic && menuMusic.paused) {
            menuMusic.play().then(() => {
                console.log('Music play triggered');
            }).catch((error) => {
                console.error('Music play failed:', error);
            });
        }
    }, { once: true });



    const customSpeedInput = document.createElement('input');
    customSpeedInput.type = 'number';
    customSpeedInput.id = 'customSpeed';
    customSpeedInput.value = customComputerSpeed;
    customSpeedInput.min = 1;
    customSpeedInput.max = 10;
    customSpeedInput.style.display = 'none'; // Initially hidden
    const menuElement = document.getElementById('menu');
    if (menuElement) {
        menuElement.appendChild(customSpeedInput);
    }

    difficultySelect.addEventListener('change', () => {
        if (difficultySelect.value === 'custom') {
            customSpeedInput.style.display = 'block'; // Show custom speed input
        } else {
            customSpeedInput.style.display = 'none'; // Hide custom speed input
        }
    });

    ballTrailCheckbox.addEventListener('change', () => {
        ballTrailEnabled = ballTrailCheckbox.checked;
    });

    maxBallSpeedSlider = document.getElementById('maxBallSpeed');
    if (maxBallSpeedSlider) {
        maxBallSpeed = (parseFloat(maxBallSpeedSlider.value) || 5);
        maxBallSpeedSlider.addEventListener('input', () => {
            maxBallSpeed = parseFloat(maxBallSpeedSlider.value);
        });
    }

    musicVolumeSlider = document.getElementById('musicVolume');
    if (musicVolumeSlider) {
        musicVolumeSlider.addEventListener('input', () => {
            const volume = parseFloat(musicVolumeSlider.value) / 100;
            const menuMusic = document.getElementById('menuMusic');
            const gameMusic = document.getElementById('gameMusic');
            if (menuMusic) {
                menuMusic.volume = volume;
                if (volume === 0) menuMusic.muted = true; else menuMusic.muted = false;
            }
            if (gameMusic) {
                gameMusic.volume = volume;
                if (volume === 0) gameMusic.muted = true; else gameMusic.muted = false;
            }
        });
    }

    // Arena size sliders
    canvasWidthSlider = document.getElementById('canvasWidth');
    canvasHeightSlider = document.getElementById('canvasHeight');

    function updateCanvasSize() {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Scale dimensions
        paddleHeight = 0.2125 * canvasHeight;
        paddleWidth = 0.01875 * canvasWidth;
        paddleGap = 0.01875 * canvasWidth;

        // Scale speeds
        maxBallSpeed = parseFloat(maxBallSpeedSlider.value);
        computerSpeeds.easy = 1.5;
        computerSpeeds.medium = 2;
        computerSpeeds.hard = 3;
        computerSpeeds.custom = customComputerSpeed;

        // Reset paddle positions
        playerPaddleY = (canvasHeight - paddleHeight) / 2;
        computerPaddleY = (canvasHeight - paddleHeight) / 2;

        // Reset ball if active
        if (ballX !== undefined && ballY !== undefined) {
            ballX = canvasWidth / 2;
            ballY = canvasHeight / 2;
            // Reset ball speeds to initial for new canvas size
            const initialSpeed = (canvasWidth / 800) * 3;
            ballSpeedX = (Math.random() > 0.5 ? initialSpeed : -initialSpeed);
            ballSpeedY = (Math.random() - 0.5) * (initialSpeed * 2);
            // Clamp to maxBallSpeed
            ballSpeedX = Math.sign(ballSpeedX) * Math.min(Math.abs(ballSpeedX), maxBallSpeed);
            ballSpeedY = Math.sign(ballSpeedY) * Math.min(Math.abs(ballSpeedY), maxBallSpeed);
        }

        // Clear trails
        ballTrail = [];
        glowTrail = [];

        draw();
    }

    if (canvasWidthSlider) {
        canvasWidth = parseInt(canvasWidthSlider.value) || 800;
        canvasWidthSlider.addEventListener('input', () => {
            canvasWidth = parseInt(canvasWidthSlider.value);
            updateCanvasSize();
        });
    }

    if (canvasHeightSlider) {
        canvasHeight = parseInt(canvasHeightSlider.value) || 400;
        canvasHeightSlider.addEventListener('input', () => {
            canvasHeight = parseInt(canvasHeightSlider.value);
            updateCanvasSize();
        });
    }

    // Initial setup
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    paddleHeight = 0.2125 * canvasHeight;
    paddleWidth = 0.01875 * canvasWidth;
    paddleGap = 0.01875 * canvasWidth;
    playerPaddleY = (canvasHeight - paddleHeight) / 2;
    computerPaddleY = (canvasHeight - paddleHeight) / 2;

    // Update glow for color inputs
    paddleColorInput = document.getElementById('paddleColor');
    ballColorInput = document.getElementById('ballColor');
    function updateGlow(input) {
        input.style.boxShadow = `0 0 20px ${input.value}`;
        input.style.border = `2px solid ${input.value}`;
    }
    if (paddleColorInput) {
        updateGlow(paddleColorInput);
        paddleColorInput.addEventListener('input', () => updateGlow(paddleColorInput));
    }
    if (ballColorInput) {
        updateGlow(ballColorInput);
        ballColorInput.addEventListener('input', () => updateGlow(ballColorInput));
    }

    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            console.log('Settings button clicked!');
            document.getElementById('menu').style.display = 'none';
            const settingsMenu = document.getElementById('settingsMenu');
            settingsMenu.style.display = 'flex';
            // Set initial state for whoosh in animation
            settingsMenu.style.opacity = '0';
            settingsMenu.style.transform = 'translateX(20%) scale(0.95)';
            // Force reflow to apply initial styles
            settingsMenu.offsetHeight; // Trigger reflow
            settingsMenu.classList.remove('hide');
            settingsMenu.classList.add('show');
            // Remove inline styles after short delay to allow CSS transition to end state
            setTimeout(() => {
                settingsMenu.style.opacity = '';
                settingsMenu.style.transform = '';
            }, 10);
            console.log('Settings menu should now be visible with whoosh in');
        });
    }

    const title = document.querySelector('h1');
    if (title) {
        title.addEventListener('click', () => {
            console.log('Title clicked!');
            const secretMenu = document.getElementById('secretMenu');
            secretMenu.style.display = 'flex';
            // Set initial state for whoosh in animation
            secretMenu.style.opacity = '0';
            secretMenu.style.transform = 'translateX(20%) scale(0.95)';
            // Force reflow to apply initial styles
            secretMenu.offsetHeight; // Trigger reflow
            secretMenu.classList.remove('hide');
            secretMenu.classList.add('show');
            // Remove inline styles after short delay to allow CSS transition to end state
            setTimeout(() => {
                secretMenu.style.opacity = '';
                secretMenu.style.transform = '';
            }, 10);
            console.log('Secret menu should now be visible');
        });
    }

    const closeSecretButton = document.getElementById('closeSecretButton');
    if (closeSecretButton) {
        closeSecretButton.addEventListener('click', () => {
            const secretMenu = document.getElementById('secretMenu');
            secretMenu.classList.remove('show');
            secretMenu.classList.add('hide');
            setTimeout(() => {
                secretMenu.style.display = 'none';
            }, 400); // Match transition duration
        });
    }

    const closeSettingsButton = document.getElementById('closeSettingsButton');
    if (closeSettingsButton) {
        closeSettingsButton.addEventListener('click', () => {
            const settingsMenu = document.getElementById('settingsMenu');
            settingsMenu.classList.remove('show');
            settingsMenu.classList.add('hide');
            setTimeout(() => {
                location.reload();
            }, 400); // Match transition duration
        });
    }

    function applySettings() {
        // Save all settings to localStorage
        localStorage.setItem('difficulty', document.getElementById('difficulty').value);
        localStorage.setItem('ballTrailEnabled', document.getElementById('ballTrail').checked.toString());
        localStorage.setItem('spinningLEDEnabled', document.getElementById('spinningLED').checked.toString());
        localStorage.setItem('maxBallSpeed', document.getElementById('maxBallSpeed').value);
        localStorage.setItem('customComputerSpeed', document.getElementById('customSpeed').value || '2');
        localStorage.setItem('paddleSpeed', document.getElementById('paddleSpeed').value);
        localStorage.setItem('paddleColor', document.getElementById('paddleColor').value);
        localStorage.setItem('ballColor', document.getElementById('ballColor').value);
        localStorage.setItem('customBackgroundEnabled', document.getElementById('coloredBackground').checked.toString());
        localStorage.setItem('insideColor', document.getElementById('insideColor').value);
        localStorage.setItem('backgroundImageUrl', backgroundImageUrl);
        localStorage.setItem('imageBackgroundEnabled', imageBackgroundEnabled.toString());
        localStorage.setItem('canvasWidth', document.getElementById('canvasWidth').value);
        localStorage.setItem('canvasHeight', document.getElementById('canvasHeight').value);
        localStorage.setItem('musicVolume', document.getElementById('musicVolume').value);

        // Update current variables
        difficulty = document.getElementById('difficulty').value;
        ballTrailEnabled = document.getElementById('ballTrail').checked;
        spinningLEDEnabled = document.getElementById('spinningLED').checked;
        maxBallSpeed = parseFloat(document.getElementById('maxBallSpeed').value);
        customComputerSpeed = parseFloat(document.getElementById('customSpeed').value || '2');
        paddleSpeed = parseFloat(document.getElementById('paddleSpeed').value);
        paddleColor = document.getElementById('paddleColor').value;
        ballColor = document.getElementById('ballColor').value;
        customBackgroundEnabled = document.getElementById('coloredBackground').checked;
        insideColor = document.getElementById('insideColor').value;
        imageBackgroundEnabled = backgroundImageUrl !== '';
        canvasWidth = parseInt(document.getElementById('canvasWidth').value);
        canvasHeight = parseInt(document.getElementById('canvasHeight').value);
        const musicVolume = document.getElementById('musicVolume').value;
        const menuMusic = document.getElementById('menuMusic');
        const gameMusic = document.getElementById('gameMusic');
        if (menuMusic) {
            menuMusic.volume = musicVolume / 100;
        }
        if (gameMusic) {
            gameMusic.volume = musicVolume / 100;
        }

        updateCanvasSize(); // Apply canvas size changes

        // Fade out settings menu before reload
        const settingsMenu = document.getElementById('settingsMenu');
        settingsMenu.classList.remove('show');
        settingsMenu.classList.add('hide');
        setTimeout(() => {
            location.reload(); // Reload page to apply changes
        }, 400); // Match transition duration
    }

    const applySettingsButton = document.getElementById('applySettingsButton');
    if (applySettingsButton) {
        applySettingsButton.addEventListener('click', applySettings);
    }

    const resetSettingsButton = document.getElementById('resetSettingsButton');
    if (resetSettingsButton) {
        resetSettingsButton.addEventListener('click', () => {
            // Clear game-related localStorage
            localStorage.removeItem('difficulty');
            localStorage.removeItem('ballTrailEnabled');
            localStorage.removeItem('spinningLEDEnabled');
            localStorage.removeItem('maxBallSpeed');
            localStorage.removeItem('customComputerSpeed');
            localStorage.removeItem('paddleSpeed');
            localStorage.removeItem('paddleColor');
            localStorage.removeItem('ballColor');
            localStorage.removeItem('customBackgroundEnabled');
            localStorage.removeItem('insideColor');
            localStorage.removeItem('backgroundImageUrl');
            localStorage.removeItem('imageBackgroundEnabled');
            localStorage.removeItem('canvasWidth');
            localStorage.removeItem('canvasHeight');
            localStorage.removeItem('musicVolume');

            // Reset UI to defaults
            document.getElementById('difficulty').value = 'easy';
            document.getElementById('ballTrail').checked = true;
            document.getElementById('spinningLED').checked = true;
            document.getElementById('maxBallSpeed').value = '5';
            document.getElementById('customSpeed').value = '2';
            document.getElementById('paddleSpeed').value = '5';
            document.getElementById('paddleColor').value = '#ffffff';
            document.getElementById('ballColor').value = '#ff0000';
            document.getElementById('coloredBackground').checked = false;
            document.getElementById('insideColor').value = '#000000';
            document.getElementById('backgroundImageUrl').value = '';
            document.getElementById('imageInputContainer').style.display = 'block'; // Reset visibility if needed
            document.getElementById('canvasWidth').value = '800';
            document.getElementById('canvasHeight').value = '400';
            document.getElementById('musicVolume').value = '50';

            // Update variables to defaults
            difficulty = 'easy';
            ballTrailEnabled = true;
            spinningLEDEnabled = true;
            maxBallSpeed = 5;
            customComputerSpeed = 2;
            paddleSpeed = 5;
            paddleColor = '#ffffff';
            ballColor = '#ff0000';
            customBackgroundEnabled = false;
            insideColor = '#000000';
            backgroundImageUrl = '';
            imageBackgroundEnabled = false;
            canvasWidth = 800;
            canvasHeight = 400;
            const defaultVolume = 50;
            const menuMusic = document.getElementById('menuMusic');
            const gameMusic = document.getElementById('gameMusic');
            if (menuMusic) {
                menuMusic.volume = defaultVolume / 100;
            }
            if (gameMusic) {
                gameMusic.volume = defaultVolume / 100;
            }

            // Revert body background
            document.body.style.backgroundImage = "url('https://img.itch.zone/aW1hZ2UvMzM3NDgyLzE2NzQyOTcucG5n/original/oLApBE.png')";
            document.body.style.backgroundColor = '';

            updateCanvasSize(); // Apply default canvas size

            // Fade out settings menu before reload
            const settingsMenu = document.getElementById('settingsMenu');
            settingsMenu.classList.remove('show');
            settingsMenu.classList.add('hide');
            setTimeout(() => {
                location.reload(); // Reload page to apply changes
            }, 400); // Match transition duration
        });
    }

    insideColorInput = document.getElementById('insideColor');
    customBackgroundCheckbox = document.getElementById('coloredBackground');
    const colorInputContainer = document.getElementById('colorInputContainer');
    const imageInputContainer = document.getElementById('imageInputContainer');
    const backgroundImageUrlInput = document.getElementById('backgroundImageUrl');
    const applyImageButton = document.getElementById('applyImageButton');

    // Apply saved backgrounds to body on load
    if (customBackgroundEnabled) {
        if (colorInputContainer) colorInputContainer.style.display = 'block';
        document.body.style.backgroundImage = 'none';
        document.body.style.backgroundColor = insideColor;
    } else if (imageBackgroundEnabled && backgroundImageUrl) {
        document.body.style.backgroundImage = `url('${backgroundImageUrl}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundColor = '';
        if (backgroundImageUrlInput && !backgroundImageUrl.startsWith('data:')) {
            backgroundImageUrlInput.value = backgroundImageUrl;
        }
    } else {
        // Default background
        document.body.style.backgroundImage = "url('https://img.itch.zone/aW1hZ2UvMzM3NDgyLzE2NzQyOTcucG5n/original/oLApBE.png')";
        document.body.style.backgroundColor = '';
        if (colorInputContainer) colorInputContainer.style.display = 'none';
    }

    if (imageInputContainer) {
        imageInputContainer.style.display = 'block';
    }

    if (customBackgroundCheckbox && colorInputContainer) {
        // Show or hide color input based on checkbox
        customBackgroundCheckbox.addEventListener('change', () => {
            customBackgroundEnabled = customBackgroundCheckbox.checked;
            if (customBackgroundCheckbox.checked) {
                colorInputContainer.style.display = 'block';
                // Apply background color to body
                document.body.style.backgroundImage = 'none';
                document.body.style.backgroundColor = insideColorInput.value;
            } else {
                colorInputContainer.style.display = 'none';
                // Revert to original background image
                document.body.style.backgroundImage = "url('https://img.itch.zone/aW1hZ2UvMzM3NDgyLzE2NzQyOTcucG5n/original/oLApBE.png')";
                document.body.style.backgroundColor = '';
            }
        });
    }

    // Make sure image input container is always visible
    if (imageInputContainer) {
        imageInputContainer.style.display = 'block';
    }

    if (insideColorInput) {
        updateGlow(insideColorInput);
        insideColorInput.addEventListener('input', () => {
            updateGlow(insideColorInput);
            insideColor = insideColorInput.value;
            if (customBackgroundCheckbox && customBackgroundCheckbox.checked) {
                document.body.style.backgroundColor = insideColor;
            }
        });
    }

    // Handle image background functionality
    if (applyImageButton && backgroundImageUrlInput) {
        applyImageButton.addEventListener('click', () => {
            const url = backgroundImageUrlInput.value.trim();
            if (url) {
                backgroundImageUrl = url;
                imageBackgroundEnabled = true;

                // Test if the image URL is valid
                const img = new Image();
                img.onload = () => {
                    alert('Background image applied successfully!');
                    // Apply the image to the body background
                    document.body.style.backgroundImage = `url('${url}')`;
                    document.body.style.backgroundSize = 'cover';
                    document.body.style.backgroundPosition = 'center';
                    document.body.style.backgroundRepeat = 'no-repeat';
                };
                img.onerror = () => {
                    alert('Invalid image URL. Please check the URL and try again.');
                    imageBackgroundEnabled = false;
                };
                img.src = url;
            } else {
                alert('Please enter a valid image URL.');
            }
        });
    }

    // Handle file input for background image
    const backgroundImageFileInput = document.getElementById('backgroundImageFile');
    if (backgroundImageFileInput) {
        backgroundImageFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    backgroundImageUrl = e.target.result;
                    imageBackgroundEnabled = true;
                    // Apply the image to the body background
                    document.body.style.backgroundImage = `url('${backgroundImageUrl}')`;
                    document.body.style.backgroundSize = 'cover';
                    document.body.style.backgroundPosition = 'center';
                    document.body.style.backgroundRepeat = 'no-repeat';
                    alert('Background image applied successfully!');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', () => {
            gameActive = true; // Set game active when starting the game
            if (difficulty === 'custom') {
                customComputerSpeed = parseFloat(customSpeedInput.value); // Get custom speed value
            }
            resetBall(); // Initialize ball position when the game starts
            if (difficultySelect) difficultySelect.disabled = true; // Disable difficulty selection
            difficulty = difficultySelect ? difficultySelect.value : difficulty; // Get selected difficulty

            // Fade out settings button during game
            const settingsButton = document.getElementById('settingsButton');
            if (settingsButton) {
                settingsButton.classList.add('fade-out');
                settingsButton.addEventListener('animationend', () => {
                    settingsButton.style.display = 'none';
                }, { once: true });
            }

            // Fade out start button instead of hiding immediately
            startButton.classList.add('fade-out');
            startButton.addEventListener('animationend', () => {
                startButton.style.display = 'none';
            }, { once: true });

            // Add fade out to menu
            if (menuElement) {
                menuElement.classList.add('fade-out');
                menuElement.addEventListener('animationend', () => {
                    menuElement.style.display = 'none';
            const musicVolumeSlider = document.getElementById('musicVolume');
            const volume = parseFloat(musicVolumeSlider.value) / 100;
            const menuMusic = document.getElementById('menuMusic');
            if (menuMusic) {
                fadeOut(menuMusic);
            }
            const gameMusic = document.getElementById('gameMusic');
            if (gameMusic) {
                gameMusic.src = 'game-music.mp3';
                gameMusic.loop = true;
                fadeIn(gameMusic, 1000, volume);
            }
                    const gameCanvas = document.getElementById('gameCanvas');
                    if (gameCanvas) {
                        gameCanvas.style.display = 'block';
                        gameCanvas.style.opacity = '0';
                        gameCanvas.classList.add('fade-in');
                        gameCanvas.addEventListener('animationend', () => {
                            gameCanvas.classList.remove('fade-in');
                            gameCanvas.style.opacity = '1'; // Ensure opacity is fully visible after fade in
                            draw();
                        }, { once: true });
                    }
                }, { once: true });
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'f') {
            if (!document.fullscreenElement) {
                if (canvas.requestFullscreen) {
                    canvas.requestFullscreen();
                } else if (canvas.mozRequestFullScreen) { // Firefox
                    canvas.mozRequestFullScreen();
                } else if (canvas.webkitRequestFullscreen) { // Chrome, Safari and Opera
                    canvas.webkitRequestFullscreen();
                } else if (canvas.msRequestFullscreen) { // IE/Edge
                    canvas.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.mozCancelFullScreen) { // Firefox
                    document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) { // IE/Edge
                    document.msExitFullscreen();
                }
            }
        }
    });
});

let upPressed = false; // Flag for up arrow key
let downPressed = false; // Flag for down arrow key
let wPressed = false; // Flag for 'W' key
let sPressed = false; // Flag for 'S' key

document.addEventListener('keydown', (event) => {
    if (event.key === 'w') {
        wPressed = true; // Set flag for 'W' key
    } else if (event.key === 's') {
        sPressed = true; // Set flag for 'S' key
    } else if (event.key === 'ArrowUp') {
        upPressed = true; // Set flag for up arrow key
    } else if (event.key === 'ArrowDown') {
        downPressed = true; // Set flag for down arrow key
    }
    console.log(`Key pressed: ${event.key}`); // Log key press for debugging
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'w') {
        wPressed = false; // Clear flag for 'W' key
    } else if (event.key === 's') {
        sPressed = false; // Clear flag for 'S' key
    } else if (event.key === 'ArrowUp') {
        upPressed = false; // Clear flag for up arrow key
    } else if (event.key === 'ArrowDown') {
        downPressed = false; // Clear flag for down arrow key
    }
    console.log(`Key released: ${event.key}`); // Log key release for debugging
});

document.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleY = canvas.height / rect.height;
    const mouseY = (event.clientY - rect.top) * scaleY;

    lastPlayerPaddleY = playerPaddleY; // Update last paddle position
    playerPaddleY = Math.max(0, Math.min(mouseY - paddleHeight / 2, canvas.height - paddleHeight)); // Adjust for gap
});

draw();
