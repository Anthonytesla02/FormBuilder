// Click Tracking for FormCraft Pro
(function() {
    'use strict';

    // Configuration
    const TRACKING_CONFIG = {
        enabled: true,
        endpoint: '/api/track',
        batchSize: 10,
        flushInterval: 5000, // 5 seconds
        maxRetries: 3,
        retryDelay: 1000
    };

    // Storage for pending events
    let eventQueue = [];
    let sessionId = null;
    let userId = null;

    // Initialize session tracking
    function initializeSession() {
        // Generate session ID if not exists
        sessionId = sessionStorage.getItem('formcraft_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('formcraft_session_id', sessionId);
        }

        // Get user ID if logged in
        const userElement = document.querySelector('[data-user-id]');
        if (userElement) {
            userId = userElement.dataset.userId;
        }
    }

    // Capture device and browser information
    function getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            referrer: document.referrer
        };
    }

    // Track an event
    function trackEvent(eventType, data = {}) {
        if (!TRACKING_CONFIG.enabled) return;

        const event = {
            id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: eventType,
            timestamp: new Date().toISOString(),
            sessionId: sessionId,
            userId: userId,
            url: window.location.href,
            path: window.location.pathname,
            data: data,
            device: getDeviceInfo()
        };

        // Add to queue
        eventQueue.push(event);
        
        // Flush if batch size reached
        if (eventQueue.length >= TRACKING_CONFIG.batchSize) {
            flushEvents();
        }
    }

    // Send events to server
    async function flushEvents() {
        if (eventQueue.length === 0) return;

        const eventsToSend = [...eventQueue];
        eventQueue = [];

        try {
            const response = await fetch(TRACKING_CONFIG.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    events: eventsToSend,
                    meta: {
                        timestamp: new Date().toISOString(),
                        sessionId: sessionId
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.warn('Failed to send tracking events:', error);
            // Add events back to queue for retry
            eventQueue = eventsToSend.concat(eventQueue);
        }
    }

    // Track page view
    function trackPageView() {
        trackEvent('page_view', {
            title: document.title,
            url: window.location.href,
            loadTime: performance.now()
        });
    }

    // Track clicks on elements
    function setupClickTracking() {
        document.addEventListener('click', function(event) {
            const element = event.target.closest('[data-track]');
            if (!element) return;

            const trackingData = {
                element: element.tagName.toLowerCase(),
                id: element.id || null,
                className: element.className || null,
                text: element.textContent?.trim().substring(0, 100) || null,
                href: element.href || null,
                position: {
                    x: event.clientX,
                    y: event.clientY
                },
                trackingId: element.dataset.track
            };

            trackEvent('click', trackingData);
        }, true);

        // Auto-track common elements
        document.addEventListener('click', function(event) {
            const element = event.target;
            
            // Track button clicks
            if (element.matches('button, .btn, [role="button"]')) {
                trackEvent('button_click', {
                    element: 'button',
                    text: element.textContent?.trim().substring(0, 50),
                    type: element.type || 'button',
                    className: element.className
                });
            }
            
            // Track form submissions
            if (element.matches('input[type="submit"], button[type="submit"]')) {
                const form = element.closest('form');
                if (form) {
                    trackEvent('form_submit_attempt', {
                        formId: form.id || null,
                        formAction: form.action || null,
                        formMethod: form.method || 'get'
                    });
                }
            }
            
            // Track navigation links
            if (element.matches('a[href]')) {
                trackEvent('link_click', {
                    href: element.href,
                    text: element.textContent?.trim().substring(0, 50),
                    external: !element.href.startsWith(window.location.origin)
                });
            }
        });
    }

    // Track form interactions
    function setupFormTracking() {
        document.addEventListener('submit', function(event) {
            const form = event.target;
            if (!form.matches('form')) return;

            trackEvent('form_submit', {
                formId: form.id || null,
                formAction: form.action || null,
                formMethod: form.method || 'get',
                fieldCount: form.querySelectorAll('input, select, textarea').length
            });
        });

        document.addEventListener('change', function(event) {
            const element = event.target;
            if (!element.matches('input, select, textarea')) return;

            trackEvent('form_field_change', {
                fieldType: element.type || element.tagName.toLowerCase(),
                fieldName: element.name || null,
                fieldId: element.id || null,
                hasValue: !!element.value
            });
        });
    }

    // Track scroll depth
    function setupScrollTracking() {
        let maxScroll = 0;
        let scrollDepthMarkers = [25, 50, 75, 100];
        let triggeredMarkers = new Set();

        function trackScrollDepth() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = Math.round((scrollTop / docHeight) * 100);

            maxScroll = Math.max(maxScroll, scrollPercent);

            scrollDepthMarkers.forEach(marker => {
                if (scrollPercent >= marker && !triggeredMarkers.has(marker)) {
                    triggeredMarkers.add(marker);
                    trackEvent('scroll_depth', {
                        depth: marker,
                        maxDepth: maxScroll
                    });
                }
            });
        }

        let scrollTimeout;
        document.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(trackScrollDepth, 100);
        });
    }

    // Track time on page
    function setupTimeTracking() {
        const startTime = Date.now();
        let lastActivity = startTime;

        function updateActivity() {
            lastActivity = Date.now();
        }

        // Update activity on user interactions
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, updateActivity, true);
        });

        // Track time spent when leaving page
        window.addEventListener('beforeunload', function() {
            const timeSpent = Math.round((lastActivity - startTime) / 1000);
            trackEvent('time_on_page', {
                timeSpent: timeSpent,
                totalTime: Math.round((Date.now() - startTime) / 1000),
                engaged: timeSpent > 10 // Consider engaged if active for more than 10 seconds
            });
        });
    }

    // Initialize tracking
    function initialize() {
        if (typeof window === 'undefined') return;

        initializeSession();
        setupClickTracking();
        setupFormTracking();
        setupScrollTracking();
        setupTimeTracking();
        
        // Track initial page view
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', trackPageView);
        } else {
            trackPageView();
        }

        // Flush events periodically
        setInterval(flushEvents, TRACKING_CONFIG.flushInterval);

        // Flush events before page unload
        window.addEventListener('beforeunload', flushEvents);

        console.log('FormCraft Pro tracking initialized');
    }

    // Public API
    window.FormCraftTracking = {
        track: trackEvent,
        flush: flushEvents,
        config: TRACKING_CONFIG
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();