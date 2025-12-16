// netlify/edge-functions/share-circle.ts
// Runs at the edge (Deno). No imports needed for basic fetch/Response.

export default async (request: Request) => {
  const url = new URL(request.url);
  // Expect /circle/{uid}
  const match = url.pathname.match(/^\/circle\/([^/]+)$/);
  if (!match) return new Response("Not Found", { status: 404 });

  const uid = match[1];

  // Fetch title from your public API (AllowAnonymous endpoint)
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
    <meta property="og:url" content="https://cal.social/circle/${safeUid}" />
    <meta property="og:type" content="website" />

    <!-- Optional: Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />

    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }
    </style>
  </head>
  <body>
    <img src="../assets/icon.png" alt="Calsocial Icon" class="app-icon" />
    <div class="container">
      <div class="error-message" id="errorMessage"></div>
    </div>
    
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


        } else {
        }
        document.getElementById("openStoreButton").addEventListener("click", redirectToStore);
      }

      }

      }

        }
      }
      
        if (!STATE.uid) return;
        try {
          if (!res.ok) return;
              }
            }
            
            } else {
            }
          }
        }
      }

      function initialize() {
        detectEnvironment();

        if (!STATE.uid) {
          showError("Error: Circle ID is missing");
          return;
        }

        
        if (STATE.platform === "ios") {
          handleIOS();
        } else if (STATE.platform === "android") {
          handleAndroid();
        } else {
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


