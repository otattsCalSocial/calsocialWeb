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
      /* --- your existing CSS unchanged --- */
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        margin: 0; padding: 0; display: flex; align-items: center; justify-content: center;
        min-height: 100vh; background-color: #9b111e; color: #333;
      }
      .app-icon { width: 64px; height: 64px; position: absolute; top: 20px; left: 50%; transform: translateX(-50%); }
      .container { background: #fff; border-radius: 16px; padding: 30px 25px; max-width: 600px; width: 90%;
        box-shadow: 0 4px 20px rgba(0,0,0,.1); text-align: center; position: relative; }
      .message { font-size: 1.2em; margin-bottom: 20px; }
      .error-message { background-color: #fdecea; color: #e74c3c; border-radius: 8px; padding: 10px; margin: 15px 0; display: none; }
      .button { display: inline-block; padding: 12px 24px; background-color: #9b111e; color: #fff; text-decoration: none;
        border-radius: 8px; margin: 10px; font-weight: 600; border: none; cursor: pointer; transition: background-color .3s, transform .2s; }
      .button:hover { background-color: #7d0e18; transform: translateY(-2px); }
      .app-buttons { margin: 20px 0; }
      .app-buttons .button { width: 100%; max-width: 200px; }
      /* Event preview styles */
      .event-preview { display: none; text-align: left; margin-bottom: 20px; }
      .event-header-image { width: 100%; max-height: 300px; object-fit: cover; border-radius: 12px; margin-bottom: 16px; }
      .event-emoji { font-size: 48px; margin-bottom: 12px; }
      .event-title { font-size: 28px; font-weight: bold; color: #333; margin-bottom: 8px; line-height: 1.2; }
      .event-description { font-size: 16px; color: #666; line-height: 1.5; margin-bottom: 16px; }
      .event-details { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
      .event-detail-item { display: flex; align-items: center; gap: 8px; font-size: 15px; color: #555; }
      .event-detail-item .icon { width: 20px; text-align: center; }
      .attendee-count { font-size: 16px; color: #9B111E; font-weight: 500; margin-top: 8px; }
    </style>
  </head>
  <body>
    <img src="../assets/icon.png" alt="Calsocial Icon" class="app-icon" />
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

      <div class="message" id="message">Opening calsocial...</div>
      <div class="error-message" id="errorMessage"></div>

      <!-- App Buttons Section -->
      <div id="appButtons" style="display: none" class="app-buttons">
        <button class="button" id="openStoreButton">Download calsocial</button>
        <button class="button" id="openAppButton">Open calsocial</button>
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
        document.getElementById("message").textContent = "Error";
      }

      function showAppButtons() {
        document.getElementById("message").textContent =
          "To view this event, please download or open the calsocial app:";
        const appButtonsDiv = document.getElementById("appButtons");
        appButtonsDiv.style.display = "block";

        if (STATE.isInAppBrowser) {
          document.getElementById("openAppButton").addEventListener("click", openAppInAppBrowser);
        } else {
          document.getElementById("openAppButton").addEventListener("click", openAppNormal);
        }
        document.getElementById("openStoreButton").addEventListener("click", redirectToStore);
      }

      function openAppNormal() {
        window.location.href = STATE.urls.deepLink;
        setTimeout(() => {
          if (!document.hidden) {
            showAppButtons();
          }
        }, 2000);
      }

      function openAppInAppBrowser() {
        if (STATE.platform === "ios") {
          window.location.href = STATE.urls.universalLink;
        } else {
          window.location.href = STATE.urls.deepLink;
        }
        setTimeout(showAppButtons, 2500);
      }

      function redirectToStore() {
        if (STATE.platform === "ios") {
          window.location.href = STATE.urls.appStoreURL;
        } else if (STATE.platform === "android") {
          window.location.href = STATE.urls.playStoreURL;
        } else {
          showError("Please open this link on an iOS or Android device to download the app.");
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
        // Show preview first, then handle redirect
        showEventPreview();
        if (STATE.isInAppBrowser) {
          showAppButtons();
          document.getElementById("message").textContent =
            "To view this event, please download or open the calsocial app:";
        } else {
          // Delay redirect to show preview
          setTimeout(() => {
            openAppNormal();
          }, 1500);
        }
      }

      function handleAndroid() {
        // Show preview first, then handle redirect
        showEventPreview();
        if (STATE.isInAppBrowser) {
          showAppButtons();
          document.getElementById("message").textContent =
            "To view this event, please download or open the calsocial app:";
        } else {
          // Delay redirect to show preview
          setTimeout(() => {
            openAppNormal();
          }, 1500);
        }
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

        if (STATE.platform === "ios") {
          handleIOS();
        } else if (STATE.platform === "android") {
          handleAndroid();
        } else {
          // Desktop - show preview and buttons
          showEventPreview();
          showAppButtons();
          document.getElementById("message").textContent =
            "To view this event, please download or open the calsocial app:";
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
