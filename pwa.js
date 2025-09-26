// PWA functionality
let deferredPrompt;
let isInstalled = false;

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Handle install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show install banner after a delay
    setTimeout(showInstallBanner, 3000);
});

function showInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (banner && deferredPrompt && !isInstalled) {
        banner.classList.remove('hidden');
    }
}

// Install button event
document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('install-btn');
    const dismissBtn = document.getElementById('dismiss-btn');
    const banner = document.getElementById('install-banner');
    
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                // Show the prompt
                deferredPrompt.prompt();
                
                // Wait for the user to respond to the prompt
                const { outcome } = await deferredPrompt.userChoice;
                
                console.log(`User response to the install prompt: ${outcome}`);
                
                // Clear the prompt
                deferredPrompt = null;
                
                // Hide the banner
                banner.classList.add('hidden');
                
                if (outcome === 'accepted') {
                    isInstalled = true;
                }
            }
        });
    }
    
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            banner.classList.add('hidden');
        });
    }
});

// Handle app installation
window.addEventListener('appinstalled', (evt) => {
    console.log('App installed successfully');
    isInstalled = true;
    
    // Hide install banner
    const banner = document.getElementById('install-banner');
    if (banner) {
        banner.classList.add('hidden');
    }
    
    // Show thank you message or analytics
    if ('gtag' in window) {
        gtag('event', 'app_installed', {
            event_category: 'PWA',
            event_label: 'Ball Swipe Game'
        });
    }
});

// Handle online/offline status
function updateOnlineStatus() {
    const statusMessage = navigator.onLine ? 'Online' : 'Offline';
    console.log(`App is ${statusMessage}`);
    
    // You can show a toast or update UI here
    if (!navigator.onLine) {
        showOfflineMessage();
    }
}

function showOfflineMessage() {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = 'offline-toast';
    toast.textContent = '📡 You\'re offline - but you can still play!';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #FF6B6B;
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        z-index: 1001;
        font-weight: bold;
        animation: fadeInOut 4s ease-in-out;
    `;
    
    // Add fade in/out animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            20% { opacity: 1; transform: translateX(-50%) translateY(0); }
            80% { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 4000);
}

// Listen for online/offline events
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Handle share functionality (if Web Share API is available)
if (navigator.share) {
    // Add share button functionality
    const shareScore = async (score) => {
        try {
            await navigator.share({
                title: 'Ball Swipe Game',
                text: `I just scored ${score} points in Ball Swipe! Can you beat my score?`,
                url: window.location.href
            });
        } catch (err) {
            console.log('Error sharing:', err);
        }
    };
    
    // You can call shareScore(score) when game ends
}

// Performance monitoring (optional)
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
            }
        }, 0);
    });
}

// Handle PWA display mode
function isPWADisplayMode() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
}

if (isPWADisplayMode()) {
    console.log('Running in PWA mode');
    // Add PWA-specific behavior here
    document.body.classList.add('pwa-mode');
}

// Add to homescreen prompt for iOS
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
    return window.navigator.standalone === true;
}

if (isIOS() && !isInStandaloneMode()) {
    // Show iOS install instructions
    setTimeout(() => {
        const iosInstructions = document.createElement('div');
        iosInstructions.className = 'ios-install-prompt';
        iosInstructions.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #007AFF;
                color: white;
                padding: 15px 20px;
                border-radius: 15px;
                font-size: 14px;
                max-width: 300px;
                text-align: center;
                z-index: 1002;
                box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            ">
                📱 Install this app: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
                <button onclick="this.parentNode.parentNode.style.display='none'" 
                        style="background: none; border: none; color: white; float: right; font-size: 16px; cursor: pointer;">✕</button>
            </div>
        `;
        document.body.appendChild(iosInstructions);
        
        setTimeout(() => {
            if (iosInstructions.parentNode) {
                iosInstructions.style.opacity = '0';
                iosInstructions.style.transition = 'opacity 0.5s';
                setTimeout(() => {
                    if (iosInstructions.parentNode) {
                        iosInstructions.parentNode.removeChild(iosInstructions);
                    }
                }, 500);
            }
        }, 8000);
    }, 5000);
}