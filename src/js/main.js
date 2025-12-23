// State Machine
const STATE = {
    INTRO: 'intro',
    MAIN_IDLE: 'main_idle',
    ENVELOPE_CENTERED: 'envelope_centered',
    ENVELOPE_OPENING: 'envelope_opening',
    LETTER_SHOWN: 'letter_shown',
};

// Global state
let currentState = STATE.INTRO;

// Cached DOM elements
let body;
let introScreen;
let mainScreen;
let envelopeTeaser;
let envelopeStage;
let envelopeContainer;
let envelopeBody;
let envelopeFlap;
let letter;
let replayButton;

// Intro event listeners (to be removed after first interaction)
let introClickHandler;
let introWheelHandler;
let introKeydownHandler;

// Envelope teaser timer
let envelopeIdleTimer = null;

// Envelope interaction step tracker
let envelopeClickStep = 0;

// Typewriter effect timers (to be cleared if user navigates early)
let typewriterTimers = [];

// Store original intro text for restoration if needed
let introHeadingText = '';
let introSubtitleText = '';

/**
 * Initialize the application
 */
function init() {
    // Cache DOM elements
    body = document.body;
    introScreen = document.getElementById('intro-screen');
    mainScreen = document.getElementById('main-screen');
    envelopeTeaser = document.getElementById('envelope-teaser');
    envelopeStage = document.getElementById('envelope-stage');
    envelopeContainer = document.querySelector('.envelope-container');
    envelopeBody = document.querySelector('.envelope-body');
    envelopeFlap = document.querySelector('.envelope-flap');
    letter = document.querySelector('.letter');
    replayButton = document.querySelector('.replay-button');

    // Create replay button if it doesn't exist
    if (!replayButton && envelopeStage) {
        replayButton = document.createElement('button');
        replayButton.className = 'replay-button';
        replayButton.textContent = 'Replay';
        replayButton.addEventListener('click', () => {
            window.location.reload();
        });
        envelopeStage.appendChild(replayButton);
    }

    // Set initial state
    currentState = STATE.INTRO;
    body.classList.add('state-intro');

    // Setup intro screen listeners
    setupIntroListeners();

    // Start typewriter effect for intro screen
    startIntroTypewriter();
}

/**
 * Setup event listeners for intro screen
 */
function setupIntroListeners() {
    introClickHandler = handleIntroInteraction;
    introWheelHandler = handleIntroInteraction;
    introKeydownHandler = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleIntroInteraction();
        }
    };

    window.addEventListener('click', introClickHandler, { once: true });
    window.addEventListener('wheel', introWheelHandler, { once: true, passive: true });
    window.addEventListener('keydown', introKeydownHandler, { once: true });
}

/**
 * Handle first interaction on intro screen
 */
function handleIntroInteraction() {
    goToMainScreen();
}

/**
 * Remove intro event listeners
 */
function removeIntroListeners() {
    window.removeEventListener('click', introClickHandler);
    window.removeEventListener('wheel', introWheelHandler);
    window.removeEventListener('keydown', introKeydownHandler);
}

/**
 * Typewriter effect function
 * @param {HTMLElement} element - The element to type into
 * @param {string} fullText - The complete text to type
 * @param {number} speed - Delay in milliseconds between characters
 * @param {Function} callback - Optional callback when typing is complete
 */
function typeText(element, fullText, speed, callback) {
    if (!element) return;

    // Clear the element's textContent at start
    element.textContent = '';

    let currentIndex = 0;

    // Function to add next character
    function addNextChar() {
        if (currentIndex < fullText.length) {
            element.textContent += fullText[currentIndex];
            currentIndex++;
            
            // Schedule next character
            const timerId = setTimeout(addNextChar, speed);
            typewriterTimers.push(timerId);
        } else {
            // Typing complete, call callback if provided
            if (callback && typeof callback === 'function') {
                callback();
            }
        }
    }

    // Start typing
    const timerId = setTimeout(addNextChar, speed);
    typewriterTimers.push(timerId);
}

/**
 * Start typewriter effect for intro screen
 */
function startIntroTypewriter() {
    if (!introScreen || currentState !== STATE.INTRO) return;

    const headingElement = introScreen.querySelector('h1');
    const subtitleElement = introScreen.querySelector('p');

    if (!headingElement || !subtitleElement) return;

    // Store full text before clearing (for potential restoration)
    introHeadingText = headingElement.textContent.trim();
    introSubtitleText = subtitleElement.textContent.trim();

    // Clear elements initially
    headingElement.textContent = '';
    subtitleElement.textContent = '';

    // Type heading first, then subtitle via callback
    typeText(headingElement, introHeadingText, 80, () => {
        // After heading is done, start typing subtitle
        typeText(subtitleElement, introSubtitleText, 60);
    });
}

/**
 * Clear all typewriter timers
 */
function clearTypewriterTimers() {
    typewriterTimers.forEach(timerId => clearTimeout(timerId));
    typewriterTimers = [];
}

/**
 * Transition from intro screen to main screen
 */
function goToMainScreen() {
    // Clear any running typewriter effects
    clearTypewriterTimers();

    // Restore full text if typewriter was interrupted
    if (introScreen) {
        const headingElement = introScreen.querySelector('h1');
        const subtitleElement = introScreen.querySelector('p');
        
        if (headingElement && introHeadingText) {
            headingElement.textContent = introHeadingText;
        }
        if (subtitleElement && introSubtitleText) {
            subtitleElement.textContent = introSubtitleText;
        }
    }

    // Remove intro event listeners
    removeIntroListeners();

    // Update body classes
    body.classList.remove('state-intro');
    body.classList.add('state-main');

    // Toggle screen classes
    if (introScreen) {
        introScreen.classList.remove('screen-active');
        introScreen.classList.add('screen-inactive');
    }

    if (mainScreen) {
        mainScreen.classList.remove('screen-inactive');
        mainScreen.classList.add('screen-active');
    }

    // Update state
    currentState = STATE.MAIN_IDLE;

    // Ensure video plays when entering main screen
    const video = document.getElementById('background-video');
    if (video) {
        // Set video properties
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        
        // Try to play the video
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // Silently handle autoplay restrictions
                console.log('Video autoplay prevented by browser');
            });
        }
        
        // Ensure video loads
        video.load();
    }

    // Setup main screen features
    setupEnvelopeTeaser();
    setupEnvelopeStage();
    startEnvelopeIdleAnimationTimer();
}

/**
 * Setup envelope teaser interactions
 */
function setupEnvelopeTeaser() {
    if (!envelopeTeaser) return;

    // Add click listener to envelope teaser
    envelopeTeaser.addEventListener('click', () => {
        // Remove attention animation if present
        envelopeTeaser.classList.remove('teaser-attention');
        
        // Clear idle timer if it exists
        if (envelopeIdleTimer) {
            clearTimeout(envelopeIdleTimer);
            envelopeIdleTimer = null;
        }

        // Move envelope to center
        moveEnvelopeToCenter();
    }, { once: true });
}

/**
 * Setup envelope stage interactions
 */
function setupEnvelopeStage() {
    if (!envelopeContainer) return;

    // Add click listener on envelope container
    envelopeContainer.addEventListener('click', (e) => {
        // Don't trigger if clicking on replay button
        if (e.target === replayButton || replayButton?.contains(e.target)) {
            return;
        }

        if (envelopeClickStep === 1) {
            // First click: open envelope flap
            openEnvelopeFlap();
            envelopeClickStep = 2;
            // Update hint text
            updateEnvelopeHint('Tap again to show the letter');
        } else if (envelopeClickStep === 2) {
            // Second click: reveal letter
            revealLetter();
            envelopeClickStep = 3;
            // Hide hint text
            hideEnvelopeHint();
        }
        // If step is 3 or higher, ignore (replay button handles reset)
    });
}

/**
 * Update envelope hint text
 */
function updateEnvelopeHint(text) {
    const hint = document.querySelector('.envelope-hint');
    if (hint) {
        hint.textContent = text;
    }
}

/**
 * Hide envelope hint
 */
function hideEnvelopeHint() {
    const hint = document.querySelector('.envelope-hint');
    if (hint) {
        gsap.to(hint, {
            opacity: 0,
            duration: 0.3,
            onComplete: () => {
                hint.style.display = 'none';
            }
        });
    }
}

/**
 * Start idle animation timer for envelope teaser
 */
function startEnvelopeIdleAnimationTimer() {
    // Clear any existing timer
    if (envelopeIdleTimer) {
        clearTimeout(envelopeIdleTimer);
        envelopeIdleTimer = null;
    }

    // Only start timer if state is MAIN_IDLE
    if (currentState !== STATE.MAIN_IDLE) {
        return;
    }

    // Set timer to add attention animation after 6000ms
    envelopeIdleTimer = setTimeout(() => {
        if (envelopeTeaser && currentState === STATE.MAIN_IDLE) {
            envelopeTeaser.classList.add('teaser-attention');
        }
    }, 6000);
}

/**
 * Move envelope from teaser position to center stage
 */
function moveEnvelopeToCenter() {
    // Update state
    currentState = STATE.ENVELOPE_CENTERED;

    // Show envelope stage as overlay (remove hidden, add overlay-active)
    if (envelopeStage) {
        envelopeStage.classList.remove('hidden');
        envelopeStage.classList.add('overlay-active');
    }

    // Hide envelope teaser (add hidden class)
    if (envelopeTeaser) {
        envelopeTeaser.classList.add('hidden');
    }

    // Ensure envelope container is visible and centered
    if (envelopeContainer) {
        envelopeContainer.style.display = 'flex';
    }

    // GSAP animation: animate envelope container (stage opacity handled by CSS transition)
    if (envelopeContainer) {
        // Set initial state
        gsap.set(envelopeContainer, { opacity: 0, scale: 0.8 });

        // Animate container
        gsap.to(envelopeContainer, {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: 'back.out(1.2)'
        });
    }

    // Set click step to 1 (ready for first click to open)
    envelopeClickStep = 1;

    // Ensure hint text is visible and set to initial message
    const hint = document.querySelector('.envelope-hint');
    if (hint) {
        hint.textContent = 'Tap to open';
        hint.style.display = 'inline-block';
        gsap.set(hint, { opacity: 1 });
    }
}

/**
 * Open envelope flap
 */
function openEnvelopeFlap() {
    // Update state
    currentState = STATE.ENVELOPE_OPENING;

    // GSAP animation: rotate flap around its top edge
    if (envelopeFlap) {
        // Add class as fallback
        envelopeFlap.classList.add('envelope-open');

        // Animate rotation using rotateX for a flip-down effect
        // Using rotateX for a more realistic envelope opening
        gsap.to(envelopeFlap, {
            rotationX: -160,
            duration: 0.8,
            ease: 'power2.in',
            transformOrigin: '50% 0'
        });
    }
}

/**
 * Reveal letter
 * 
 * GSAP TRANSFORM NOTE:
 * The .letter element uses CSS transform: translate(-50%, -50%) for centering.
 * GSAP's inline transforms would override this. To preserve centering while
 * animating, we use xPercent/yPercent for the base position and animate
 * with relative yPercent offset for the slide-up effect.
 */
function revealLetter() {
    // Update state
    currentState = STATE.LETTER_SHOWN;

    // Hide envelope when letter is revealed
    if (envelopeBody) {
        envelopeBody.classList.add('hidden');
    }
    if (envelopeFlap) {
        envelopeFlap.classList.add('hidden');
    }
    const envelopeInnerShadow = document.querySelector('.envelope-inner-shadow');
    if (envelopeInnerShadow) {
        envelopeInnerShadow.classList.add('hidden');
    }

    // GSAP animation: reveal letter with slide up and fade in
    if (letter) {
        // Remove hidden class and add visible class
        letter.classList.remove('letter-hidden');
        letter.classList.add('letter-visible');

        // Set initial state with centering preserved
        // xPercent: -50, yPercent: -50 maintains the CSS centering
        // yPercent: -40 (instead of -50) creates a +10% offset for "below" position
        gsap.set(letter, { 
            opacity: 0, 
            xPercent: -50, 
            yPercent: -40  // Start slightly below center (-50 + 10 = -40)
        });

        // Animate letter to centered position
        gsap.to(letter, {
            opacity: 1,
            yPercent: -50,  // Animate to true center
            duration: 0.6,
            ease: 'power2.out',
            delay: 0.2,
            onComplete: () => {
                // Show replay button after letter is revealed
                if (replayButton) {
                    replayButton.classList.add('visible');
                    gsap.to(replayButton, {
                        opacity: 1,
                        duration: 0.4,
                        ease: 'power2.out'
                    });
                }
            }
        });
    }
}

/**
 * Reset envelope sequence to start
 */
function resetEnvelopeSequence() {
    // Reset state
    currentState = STATE.MAIN_IDLE;
    envelopeClickStep = 0;

    // Hide replay button
    if (replayButton) {
        replayButton.classList.remove('visible');
        gsap.set(replayButton, { opacity: 0 });
    }

    // Hide envelope stage overlay with animation
    if (envelopeStage) {
        // Remove overlay-active class to trigger CSS transition
        envelopeStage.classList.remove('overlay-active');
        
        // Animate container scale down
        if (envelopeContainer) {
            gsap.to(envelopeContainer, {
                scale: 0.9,
                duration: 0.4,
                ease: 'power2.in'
            });
        }

        // Wait for CSS transition to complete, then add hidden class
        setTimeout(() => {
            envelopeStage.classList.add('hidden');
            
            // Reset all classes
            if (envelopeBody) {
                envelopeBody.classList.remove('hidden');
            }
            if (envelopeFlap) {
                envelopeFlap.classList.remove('envelope-open');
                envelopeFlap.classList.remove('hidden');
                gsap.set(envelopeFlap, { rotationX: 0 });
            }
            const envelopeInnerShadow = document.querySelector('.envelope-inner-shadow');
            if (envelopeInnerShadow) {
                envelopeInnerShadow.classList.remove('hidden');
            }

            if (letter) {
                letter.classList.remove('letter-visible');
                letter.classList.add('letter-hidden');
                // Reset with centering preserved (xPercent: -50, yPercent: -40 = below center)
                gsap.set(letter, { opacity: 0, xPercent: -50, yPercent: -40 });
            }

            // Reset envelope container
            if (envelopeContainer) {
                gsap.set(envelopeContainer, { opacity: 1, scale: 1 });
            }

            // Reset hint text
            const hint = document.querySelector('.envelope-hint');
            if (hint) {
                hint.textContent = 'Tap to open';
                hint.style.display = 'inline-block';
                gsap.set(hint, { opacity: 1 });
            }
        }, 400); // Match CSS transition duration
    }

    // Show envelope teaser again
    if (envelopeTeaser) {
        envelopeTeaser.classList.remove('hidden');
        gsap.fromTo(envelopeTeaser, 
            { opacity: 0, scale: 0.8 },
            { 
                opacity: 1, 
                scale: 1, 
                duration: 0.5, 
                ease: 'back.out(1.2)',
                delay: 0.2
            }
        );
    }

    // Restart idle animation timer
    startEnvelopeIdleAnimationTimer();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);

