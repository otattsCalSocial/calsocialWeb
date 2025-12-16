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
      /* Circle preview styles */
      .circle-preview { display: none; text-align: center; margin-bottom: 20px; }
      .circle-picture { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin: 0 auto 16px; border: 1px solid #e0e0e0; }
      .circle-picture-placeholder { width: 100px; height: 100px; border-radius: 50%; background-color: #fff; border: 1px solid #e0e0e0; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 48px; color: #9B111E; }
      .circle-name { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 4px; }
      .circle-member-count { font-size: 14px; color: #9B111E; font-weight: 500; margin-bottom: 12px; }
      .circle-description { font-size: 15px; color: #666; line-height: 1.5; text-align: center; margin-bottom: 16px; }
    </style>
  </head>
  <body>
    <img src="../assets/icon.png" alt="Calsocial Icon" class="app-icon" />
    <div class="container">
      <!-- Circle Preview Section -->
      <div id="circlePreview" class="circle-preview" style="${title && title !== 'calsocial circle' ? 'display: block;' : 'display: none;'}">
        ${showPicture ? `<img id="circlePicture" class="circle-picture" src="${safePictureUrl}" />` : '<div id="circlePicturePlaceholder" class="circle-picture-placeholder">👥</div>'}
        <h1 id="circleName" class="circle-name">${safeTitle}</h1>
        <div id="circleMemberCount" class="circle-member-count">${memberCount} ${memberCount === 1 ? 'member' : 'members'}</div>
        ${description ? `<p id="circleDescription" class="circle-description">${safeDescription}</p>` : '<p id="circleDescription" class="circle-description" style="display: none;"></p>'}
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
        document.getElementById("message").textContent = "Error";
      }

      function showAppButtons() {
        document.getElementById("message").textContent =
          "To view this circle, please download or open the calsocial app:";
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


      function handleIOS() {
        // Show preview first, then handle redirect
        showCirclePreview();
        if (STATE.isInAppBrowser) {
          showAppButtons();
          document.getElementById("message").textContent =
            "To view this circle, please download or open the calsocial app:";
        } else {
          // Delay redirect to show preview
          setTimeout(() => {
            openAppNormal();
          }, 1500);
        }
      }

      function handleAndroid() {
        // Show preview first, then handle redirect
        showCirclePreview();
        if (STATE.isInAppBrowser) {
          showAppButtons();
          document.getElementById("message").textContent =
            "To view this circle, please download or open the calsocial app:";
        } else {
          // Delay redirect to show preview
          setTimeout(() => {
            openAppNormal();
          }, 1500);
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
            } else {
              circleDescription.style.display = "none";
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

        if (STATE.platform === "ios") {
          handleIOS();
        } else if (STATE.platform === "android") {
          handleAndroid();
        } else {
          // Desktop - show preview and buttons
          showCirclePreview();
          showAppButtons();
          document.getElementById("message").textContent =
            "To view this circle, please download or open the calsocial app:";
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

