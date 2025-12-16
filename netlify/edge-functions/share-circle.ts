// netlify/edge-functions/share-circle.ts
// Runs at the edge (Deno). No imports needed for basic fetch/Response.

export default async (request: Request) => {
  const url = new URL(request.url);
  // Expect /circle/{uid}
  const match = url.pathname.match(/^\/circle\/([^/]+)$/);
  if (!match) return new Response("Not Found", { status: 404 });

  const uid = match[1];

  // Fetch circle preview from your public API (AllowAnonymous endpoint)
  let title = "calsocial circle";
  let description = "Join this circle on calsocial!";
  let imageUrl = "https://cal.social/assets/smallLogo.png";
  let memberCount = 0;
  let pictureUrl = "";
  
  try {
    const r = await fetch(`https://api.cal.social/circles/uid/${encodeURIComponent(uid)}/preview`, {
      headers: { Accept: "application/json" }
    });
    if (r.ok) {
      const circle = await r.json();
      if (circle.name) title = circle.name;
      if (circle.description) description = circle.description;
      if (circle.pictureUrl) {
        imageUrl = circle.pictureUrl;
        pictureUrl = circle.pictureUrl;
      }
      if (circle.memberCount !== undefined) memberCount = circle.memberCount;
    }
  } catch {
    // Fallback to name endpoint
    try {
      const r = await fetch(`https://api.cal.social/circles/uid/${encodeURIComponent(uid)}/name`, {
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
  const safePictureUrl = escapeHtml(pictureUrl);
  const showPicture = pictureUrl && pictureUrl.length > 0;

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
    <meta property="og:url" content="https://cal.social/circle/${safeUid}" />
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
      /* Circle preview styles - matching app design */
      .circle-preview { 
        display: none; 
        padding: 20px; 
        text-align: center;
        background: #fff;
      }
      .circle-picture { 
        width: 100px; 
        height: 100px; 
        border-radius: 50%; 
        object-fit: cover; 
        margin: 0 auto 16px; 
        border: 1px solid #e0e0e0; 
        display: block;
      }
      .circle-picture-placeholder { 
        width: 100px; 
        height: 100px; 
        border-radius: 50%; 
        background-color: #fff; 
        border: 1px solid #e0e0e0; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        margin: 0 auto 16px; 
        font-size: 48px; 
        color: #9B111E; 
      }
      .circle-name { 
        font-size: 24px; 
        font-weight: bold; 
        color: #222; 
        margin-bottom: 8px; 
      }
      .circle-member-count { 
        font-size: 16px; 
        color: #9B111E; 
        font-weight: 500; 
        margin-bottom: 16px; 
      }
      .circle-description { 
        font-size: 15px; 
        color: #555; 
        line-height: 23px; 
        text-align: center; 
        margin-bottom: 16px; 
      }
      .circle-description.has-content {
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
      /* Sticky footer button */
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
      .footer-button {
        width: 100%;
        padding: 16px;
        background-color: #9B111E;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 17px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .footer-button:hover {
        background-color: #7d0e18;
      }
      .footer-button:active {
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
      .footer-button.loading {
        opacity: 0.7;
        cursor: not-allowed;
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
      <!-- Circle Preview Section -->
      <div id="circlePreview" class="circle-preview" style="${title && title !== 'calsocial circle' ? 'display: block;' : 'display: none;'}">
        ${showPicture ? `<img id="circlePicture" class="circle-picture" src="${safePictureUrl}" />` : '<div id="circlePicturePlaceholder" class="circle-picture-placeholder">👥</div>'}
        <h1 id="circleName" class="circle-name">${safeTitle}</h1>
        <div id="circleMemberCount" class="circle-member-count">${memberCount} ${memberCount === 1 ? 'member' : 'members'}</div>
        ${description ? `<p id="circleDescription" class="circle-description has-content">${safeDescription}</p>` : '<p id="circleDescription" class="circle-description" style="display: none;"></p>'}
      </div>

      <div class="error-message" id="errorMessage"></div>
    </div>
    
    <!-- Sticky Footer Button -->
    <div class="sticky-footer">
      <button class="footer-button" id="openAppButton">
        <span id="buttonText">Open in calsocial</span>
      </button>
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
          deepLink: \`calsocial://circle/\${STATE.uid}\`,
          universalLink: \`https://cal.social/circle/\${STATE.uid}\`,
          appStoreURL: "https://apps.apple.com/app/calsocial/id6738835548",
          playStoreURL: "https://play.google.com/store/apps/details?id=social.cal.calsocial",
        };
      }

      function showError(message) {
        const errorElement = document.getElementById("errorMessage");
        errorElement.textContent = message;
        errorElement.style.display = "block";
      }

      let appInstalled = null; // null = unknown, true = installed, false = not installed
      let detectionTimeout = null;
      let hasAttemptedOpen = false;

      function updateButtonForAppStore() {
        const button = document.getElementById("openAppButton");
        const buttonText = document.getElementById("buttonText");
        
        button.classList.remove("loading");
        button.classList.add("secondary");
        buttonText.textContent = STATE.platform === "ios" 
          ? "Download on App Store" 
          : STATE.platform === "android"
          ? "Download on Google Play"
          : "Download calsocial";
      }

      function openApp() {
        const button = document.getElementById("openAppButton");
        
        if (appInstalled === false) {
          // App not installed, go to store
          redirectToStore();
          return;
        }
        
        if (!hasAttemptedOpen) {
          // First click - try to open the app immediately
          hasAttemptedOpen = true;
          button.classList.add("loading");
          
          // Try to open deep link immediately
          const startTime = Date.now();
          
          // Use a hidden iframe trick for better compatibility
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = STATE.urls.deepLink;
          document.body.appendChild(iframe);
          
          // Also try direct navigation as fallback
          setTimeout(() => {
            window.location.href = STATE.urls.deepLink;
          }, 100);
          
          // Set up detection
          const visibilityHandler = () => {
            if (document.hidden) {
              // App opened successfully
              appInstalled = true;
              if (detectionTimeout) {
                clearTimeout(detectionTimeout);
              }
              document.removeEventListener("visibilitychange", visibilityHandler);
              document.removeEventListener("blur", visibilityHandler);
              document.removeEventListener("pagehide", visibilityHandler);
            }
          };
          
          document.addEventListener("visibilitychange", visibilityHandler);
          document.addEventListener("blur", visibilityHandler);
          document.addEventListener("pagehide", visibilityHandler);
          
          // If page is still visible after 2 seconds, app likely didn't open
          detectionTimeout = setTimeout(() => {
            if (appInstalled === null && !document.hidden) {
              appInstalled = false;
              updateButtonForAppStore();
              document.removeEventListener("visibilitychange", visibilityHandler);
              document.removeEventListener("blur", visibilityHandler);
              document.removeEventListener("pagehide", visibilityHandler);
            }
          }, 2000);
          
          // Clean up iframe after a delay
          setTimeout(() => {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }, 3000);
          
        } else if (appInstalled === true) {
          // App is confirmed installed, open it
          window.location.href = STATE.urls.deepLink;
        } else {
          // Already attempted, app not installed
          redirectToStore();
        }
      }

      function redirectToStore() {
        if (STATE.platform === "ios") {
          window.location.href = STATE.urls.appStoreURL;
        } else if (STATE.platform === "android") {
          window.location.href = STATE.urls.playStoreURL;
        } else {
          // Desktop - show both options
          const choice = confirm("Please open this link on a mobile device.\n\nWould you like to view the App Store page?");
          if (choice) {
            window.open(STATE.urls.appStoreURL, "_blank");
          }
        }
      }


      function handleIOS() {
        showCirclePreview();
        // In-app browsers should show download button immediately
        if (STATE.isInAppBrowser) {
          appInstalled = false;
          hasAttemptedOpen = true;
          updateButtonForAppStore();
        }
      }

      function handleAndroid() {
        showCirclePreview();
        // In-app browsers should show download button immediately
        if (STATE.isInAppBrowser) {
          appInstalled = false;
          hasAttemptedOpen = true;
          updateButtonForAppStore();
        }
      }

      // Show circle preview if available
      function showCirclePreview() {
        const previewDiv = document.getElementById("circlePreview");
        if (previewDiv && document.getElementById("circleName").textContent !== "calsocial circle") {
          previewDiv.style.display = "block";
        }
      }
      
      // Fetch and display circle preview (client-side fallback/update)
      async function fetchAndDisplayCirclePreview() {
        if (!STATE.uid) return;
        try {
          const url = \`https://api.cal.social/circles/uid/\${encodeURIComponent(STATE.uid)}/preview\`;
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (!res.ok) return;
          
          const circle = await res.json();
          const previewDiv = document.getElementById("circlePreview");
          if (previewDiv && circle.name) {
            previewDiv.style.display = "block";
            
            const circlePicture = document.getElementById("circlePicture");
            const circlePicturePlaceholder = document.getElementById("circlePicturePlaceholder");
            if (circle.pictureUrl) {
              if (circlePicture) {
                circlePicture.src = circle.pictureUrl;
                circlePicture.style.display = "block";
              }
              if (circlePicturePlaceholder) {
                circlePicturePlaceholder.style.display = "none";
              }
            } else {
              if (circlePicture) circlePicture.style.display = "none";
              if (circlePicturePlaceholder) circlePicturePlaceholder.style.display = "flex";
            }
            
            document.getElementById("circleName").textContent = circle.name;
            
            const memberCount = document.getElementById("circleMemberCount");
            const count = circle.memberCount || 0;
            memberCount.textContent = \`\${count} \${count === 1 ? 'member' : 'members'}\`;
            
            const circleDescription = document.getElementById("circleDescription");
            if (circle.description) {
              circleDescription.textContent = circle.description;
              circleDescription.style.display = "block";
              circleDescription.classList.add("has-content");
            } else {
              circleDescription.style.display = "none";
              circleDescription.classList.remove("has-content");
            }
          }
        } catch (e) {
          console.error("Error fetching circle preview:", e);
        }
      }

      function initialize() {
        detectEnvironment();

        if (!STATE.uid) {
          showError("Error: Circle ID is missing");
          return;
        }

        // Show preview immediately if data is already in HTML
        showCirclePreview();
        
        // Also try to fetch and update if needed
        fetchAndDisplayCirclePreview().then(() => {
          // After preview loads, show it
          showCirclePreview();
        });

        // Set up button click handler
        document.getElementById("openAppButton").addEventListener("click", openApp);
        
        if (STATE.platform === "ios") {
          handleIOS();
        } else if (STATE.platform === "android") {
          handleAndroid();
        } else {
          // Desktop - show preview and app store button
          showCirclePreview();
          updateButtonForAppStore();
        }
      }

      document.addEventListener("DOMContentLoaded", initialize);
    </script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=120" // small cache for social crawlers
    },
    status: 200
  });
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]!));
}

