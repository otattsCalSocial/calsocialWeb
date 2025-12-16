// netlify/edge-functions/share-event.ts
// Runs at the edge (Deno). No imports needed for basic fetch/Response.

export default async (request: Request) => {
  const url = new URL(request.url);
  // Expect /event/{uid}
  const match = url.pathname.match(/^\/event\/([^/]+)$/);
  if (!match) return new Response("Not Found", { status: 404 });

  const uid = match[1];

  // Fetch event preview from your public API (AllowAnonymous endpoint)
  let title = "calsocial event";
  let description = "Join this event on calsocial!";
  let imageUrl = "https://cal.social/assets/smallLogo.png";
  let emoji = "";
  let startDate = "";
  let endDate = "";
  let location = "";
  let city = "";
  let attendeeCount = 0;
  let openInvite = true;
  
  try {
    const r = await fetch(`https://api.cal.social/events/${encodeURIComponent(uid)}/preview`, {
      headers: { Accept: "application/json" }
    });
    if (r.ok) {
      const event = await r.json();
      if (event.title) title = event.title;
      if (event.description) description = event.description;
      if (event.imageUrl) imageUrl = event.imageUrl;
      if (event.emoji) emoji = event.emoji;
      if (event.startDate) startDate = event.startDate;
      if (event.endDate) endDate = event.endDate;
      if (event.location) location = event.location;
      if (event.city) city = event.city;
      if (event.attendeeCount !== undefined) attendeeCount = event.attendeeCount;
      if (event.openInvite !== undefined) openInvite = event.openInvite;
    }
  } catch {
    // Fallback to title endpoint
    try {
      const r = await fetch(`https://api.cal.social/events/${encodeURIComponent(uid)}/title`, {
        headers: { Accept: "text/plain" }
      });
      if (r.ok) {
        const t = (await r.text()).trim();
        if (t) title = t;
      }
    } catch {
      // keep fallback
    }
  }

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeUid = escapeHtml(uid);
  const safeEmoji = escapeHtml(emoji);
  const safeLocation = escapeHtml(location || city);
  const safeImageUrl = escapeHtml(imageUrl);
  
  // Format date for display
  let formattedDate = "";
  if (startDate) {
    try {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : null;
      formattedDate = formatEventDateForDisplay(start, end);
    } catch (e) {
      formattedDate = "";
    }
  }
  
  // Determine if image should be shown
  const showImage = imageUrl && !imageUrl.includes("smallLogo.png");

  // Return your existing redirect page, but with server-rendered <title> + OG/Twitter tags.
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>${safeTitle}</title>

    <!-- Open Graph for social previews -->
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="https://cal.social/event/${safeUid}" />
    <meta property="og:type" content="website" />

    <!-- Optional: Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${imageUrl}" />

    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        margin: 0; padding: 0; padding-bottom: 80px; background-color: #f5f5f5; color: #333;
        min-height: 100vh;
      }
      .container { 
        background: #fff; 
        max-width: 600px; 
        width: 100%; 
        margin: 0 auto;
        min-height: calc(100vh - 80px);
      }
      /* Event preview styles - matching app design */
      .event-preview { 
        display: none; 
        padding: 20px; 
        background: #fff;
      }
      .event-header-image { 
        width: 100%; 
        max-height: 300px; 
        object-fit: cover; 
        border-radius: 0;
        margin: -20px -20px 20px -20px;
        display: block;
      }
      .event-emoji { 
        font-size: 48px; 
        margin-bottom: 12px; 
        text-align: center;
      }
      .event-title { 
        font-size: 24px; 
        font-weight: bold; 
        color: #222; 
        margin-bottom: 12px; 
        line-height: 1.3; 
      }
      .event-description { 
        font-size: 15px; 
        color: #555; 
        line-height: 23px; 
        margin-bottom: 20px; 
      }
      .event-details { 
        display: flex; 
        flex-direction: column; 
        gap: 12px; 
        margin-bottom: 16px; 
        padding: 12px;
        background-color: #f7f7f7;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
      }
      .event-detail-item { 
        display: flex; 
        align-items: flex-start; 
        gap: 12px; 
        font-size: 16px; 
        color: #333; 
        line-height: 22px;
      }
      .event-detail-item .icon { 
        width: 20px; 
        text-align: center; 
        flex-shrink: 0;
        margin-top: 2px;
      }
      .attendee-count { 
        font-size: 16px; 
        color: #9B111E; 
        font-weight: 500; 
        margin-top: 8px; 
        padding: 12px;
        background-color: #f7f7f7;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
      }
      .error-message { 
        background-color: #fdecea; 
        color: #e74c3c; 
        border-radius: 8px; 
        padding: 10px; 
        margin: 15px 20px; 
        display: none; 
      }
      /* Sticky footer buttons */
      .sticky-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #fff;
        border-top: 1px solid #e0e0e0;
        padding: 12px 20px;
        padding-bottom: calc(12px + env(safe-area-inset-bottom));
        box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
      }
      .button-container {
        display: flex;
        gap: 12px;
        max-width: 600px;
        margin: 0 auto;
      }
      .footer-button {
        flex: 1;
        padding: 16px;
        border: none;
        border-radius: 8px;
        font-size: 17px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      .footer-button.primary {
        background-color: #9B111E;
        color: #fff;
      }
      .footer-button.primary:hover {
        background-color: #7d0e18;
      }
      .footer-button.primary:active {
        background-color: #6a0d15;
      }
      .footer-button.secondary {
        background-color: #f5f5f5;
        color: #333;
        border: 1px solid #e0e0e0;
      }
      .footer-button.secondary:hover {
        background-color: #e8e8e8;
      }
      @media (max-width: 600px) {
        .container {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Event Preview Section -->
      <div id="eventPreview" class="event-preview" style="${title && title !== 'calsocial event' ? 'display: block;' : 'display: none;'}">
        ${showImage ? `<img id="eventImage" class="event-header-image" src="${safeImageUrl}" />` : ''}
        ${emoji ? `<div id="eventEmoji" class="event-emoji">${safeEmoji}</div>` : '<div id="eventEmoji" class="event-emoji" style="display: none;"></div>'}
        <h1 id="eventTitle" class="event-title">${safeTitle}</h1>
        ${description ? `<p id="eventDescription" class="event-description">${safeDescription}</p>` : '<p id="eventDescription" class="event-description" style="display: none;"></p>'}
        <div class="event-details">
          ${formattedDate ? `<div class="event-detail-item">
            <span class="icon">📅</span>
            <span id="eventDate">${formattedDate}</span>
          </div>` : ''}
          ${safeLocation ? `<div class="event-detail-item" id="eventLocationContainer">
            <span class="icon">📍</span>
            <span id="eventLocation">${safeLocation}</span>
          </div>` : ''}
        </div>
        <div id="attendeeCount" class="attendee-count">${attendeeCount > 0 ? `${attendeeCount} ${attendeeCount === 1 ? 'person' : 'people'} ${attendeeCount === 1 ? 'is' : 'are'} ${openInvite ? 'going' : 'invited'}` : 'Be the first to join!'}</div>
      </div>

      <div class="error-message" id="errorMessage"></div>
    </div>
    
    <!-- Sticky Footer Buttons -->
    <div class="sticky-footer">
      <div class="button-container">
        <button class="footer-button primary" id="openAppButton">Open in calsocial</button>
        <button class="footer-button secondary" id="downloadButton">Download</button>
      </div>
    </div>

    <script>
      const STATE = {
        uid: null,
        platform: null,
        isInAppBrowser: false,
        urls: {},
      };

      function detectEnvironment() {
        const ua = navigator.userAgent || navigator.vendor || window.opera;

        STATE.isInAppBrowser =
          /FBAN|FBAV|Instagram|Line|Twitter|WhatsApp|WeChat|LinkedIn|Messenger/i.test(ua);

        if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
          STATE.platform = "ios";
        } else if (/Android/.test(ua)) {
          STATE.platform = "android";
        } else {
          STATE.platform = "desktop";
        }

        const pathParts = window.location.pathname.split("/");
        STATE.uid = pathParts[pathParts.length - 1];

        STATE.urls = {
          deepLink: \`calsocial://event/\${STATE.uid}\`,
          universalLink: \`https://cal.social/event/\${STATE.uid}\`,
          appStoreURL: "https://apps.apple.com/app/calsocial/id6738835548",
          playStoreURL: "https://play.google.com/store/apps/details?id=social.cal.calsocial",
        };
      }

      function showError(message) {
        const errorElement = document.getElementById("errorMessage");
        errorElement.textContent = message;
        errorElement.style.display = "block";
      }

      function openApp() {
        window.location.href = STATE.urls.deepLink;
      }

      function downloadApp() {
        if (STATE.platform === "ios") {
          window.location.href = STATE.urls.appStoreURL;
        } else if (STATE.platform === "android") {
          window.location.href = STATE.urls.playStoreURL;
        } else {
          // Desktop - show app store link
          window.open(STATE.urls.appStoreURL, "_blank");
        }
      }

      // (Optional) JS title update for users after click; crawlers don't run JS
      async function fetchAndApplyEventTitle() {
        if (!STATE.uid) return;
        try {
          const url = \`https://api.cal.social/events/\${encodeURIComponent(STATE.uid)}/title\`;
          const res = await fetch(url, { headers: { Accept: "text/plain" } });
          if (!res.ok) return;
          const title = (await res.text()).trim();
          if (title) {
            document.title = title;
          }
        } catch (e) {}
      }

      function handleIOS() {
        showEventPreview();
      }

      function handleAndroid() {
        showEventPreview();
      }

      // Show event preview if available
      function showEventPreview() {
        const previewDiv = document.getElementById("eventPreview");
        if (previewDiv && document.getElementById("eventTitle").textContent !== "calsocial event") {
          previewDiv.style.display = "block";
          const eventImage = document.getElementById("eventImage");
          if (eventImage.src && !eventImage.src.includes("smallLogo.png")) {
            eventImage.style.display = "block";
          }
        }
      }

      function initialize() {
        detectEnvironment();

        if (!STATE.uid) {
          showError("Error: Event ID is missing");
          return;
        }

        // Show preview immediately if data is already in HTML
        showEventPreview();
        
        // Also try to fetch and update if needed
        fetchAndDisplayEventPreview().then(() => {
          // After preview loads, show it
          showEventPreview();
        });

        // Set up button click handlers
        document.getElementById("openAppButton").addEventListener("click", openApp);
        document.getElementById("downloadButton").addEventListener("click", downloadApp);
        
        if (STATE.platform === "ios") {
          handleIOS();
        } else if (STATE.platform === "android") {
          handleAndroid();
        } else {
          // Desktop
          showEventPreview();
        }
      }
      
      // Fetch and display event preview (client-side fallback/update)
      async function fetchAndDisplayEventPreview() {
        if (!STATE.uid) return;
        try {
          const url = \`https://api.cal.social/events/\${encodeURIComponent(STATE.uid)}/preview\`;
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (!res.ok) return;
          
          const event = await res.json();
          const previewDiv = document.getElementById("eventPreview");
          if (previewDiv && event.title) {
            previewDiv.style.display = "block";
            
            const eventImage = document.getElementById("eventImage");
            if (event.imageUrl) {
              eventImage.src = event.imageUrl;
              eventImage.style.display = "block";
            }
            
            const eventEmoji = document.getElementById("eventEmoji");
            if (event.emoji) {
              eventEmoji.textContent = event.emoji;
              eventEmoji.style.display = "block";
            } else {
              eventEmoji.style.display = "none";
            }
            
            document.getElementById("eventTitle").textContent = event.title;
            
            const eventDescription = document.getElementById("eventDescription");
            if (event.description) {
              eventDescription.textContent = event.description;
              eventDescription.style.display = "block";
            } else {
              eventDescription.style.display = "none";
            }
            
            const startDate = new Date(event.startDate);
            const endDate = event.endDate ? new Date(event.endDate) : null;
            document.getElementById("eventDate").textContent = formatEventDate(startDate, endDate);
            
            const locationContainer = document.getElementById("eventLocationContainer");
            const location = event.location || event.city;
            if (location) {
              document.getElementById("eventLocation").textContent = location;
              locationContainer.style.display = "flex";
            }
            
            const attendeeCount = document.getElementById("attendeeCount");
            const count = event.attendeeCount || 0;
            if (count > 0) {
              attendeeCount.textContent = \`\${count} \${count === 1 ? 'person' : 'people'} \${count === 1 ? 'is' : 'are'} \${event.openInvite ? 'going' : 'invited'}\`;
            } else {
              attendeeCount.textContent = "Be the first to join!";
            }
          }
        } catch (e) {
          console.error("Error fetching event preview:", e);
        }
      }
      
      function formatEventDate(startDate, endDate) {
        const options = { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        };
        
        if (endDate && endDate.getTime() !== startDate.getTime()) {
          const startStr = startDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          });
          const endStr = endDate.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          });
          return \`\${startStr} - \${endStr}\`;
        } else {
          return startDate.toLocaleDateString('en-US', options);
        }
      }

      document.addEventListener("DOMContentLoaded", initialize);
    </script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=120" // small cache for social crawlerss
    },
    status: 200
  });
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]!));
}

function formatEventDateForDisplay(startDate: Date, endDate: Date | null): string {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  };
  
  if (endDate && endDate.getTime() !== startDate.getTime()) {
    const startStr = startDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    const endStr = endDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    return `${startStr} - ${endStr}`;
  } else {
    return startDate.toLocaleDateString('en-US', options);
  }
}
