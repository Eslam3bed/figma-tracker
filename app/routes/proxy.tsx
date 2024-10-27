import { LoaderFunctionArgs, json } from "@remix-run/node";
import _request from "request";

// Custom User-Agent to mimic browser requests
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/337.36 (KHTML, like Gecko) Chrome/116.0.5845.179 Safari/537.36";

const injectTrackingScript = (html: string) => {
  const trackingScript = `
    <script>
      (function () {
        const SESSION_KEY = 'trackingSession';
        const EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds

        // Initialize or load the session from localStorage
        const loadSession = () => {
          const storedSession = localStorage.getItem(SESSION_KEY);
          if (storedSession) {
            const parsedSession = JSON.parse(storedSession);
            const lastTimestamp = parsedSession.length 
              ? parsedSession[parsedSession.length - 1].timestamp 
              : 0;
            const now = Date.now();
            // Check if the session has expired
            if (now - lastTimestamp > EXPIRATION_TIME) {
              console.log('Session expired. Clearing session.');
              localStorage.removeItem(SESSION_KEY);
              return [];
            } else {
              return parsedSession;
            }
          }
          return [];
        };

        // Save the updated session to localStorage
        const saveSession = (session) => {
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        };

        // Load the existing session from localStorage
        let urlLog = loadSession();
        let lastUrl = location.href;

        console.log('Tracking initialized with:', lastUrl);

        // Log URL change and store it in localStorage
        const logUrlChange = (from, to) => {
          const change = {
            from,
            to,
            timestamp: Date.now()
          };
          urlLog.push(change); // Add the change to the log
          saveSession(urlLog); // Save to localStorage
          console.log('URL Change Logged:', change);
          window.parent.postMessage({ type: 'url-change', data: change }, '*');
        };

        // Detect URL changes using MutationObserver
        const observer = new MutationObserver(() => {
          const currentUrl = location.href;
          if (currentUrl !== lastUrl) {
            logUrlChange(lastUrl, currentUrl);
            lastUrl = currentUrl;
          }
        });

        observer.observe(document, { childList: true, subtree: true });

        // Track interactions and store them in localStorage
        const trackInteraction = (type, details) => {
          const interaction = {
            type,
            timestamp: Date.now(),
            details
          };
          urlLog.push(interaction); // Add the interaction to the log
          saveSession(urlLog); // Save to localStorage
          console.log('Interaction Logged:', interaction);
          window.parent.postMessage({ type: 'interaction', data: interaction }, '*');
        };

        // Add event listeners for interactions
        window.addEventListener('click', (e) => 
          trackInteraction('click', { x: e.clientX, y: e.clientY })
        );
        window.addEventListener('scroll', () => 
          trackInteraction('scroll', { scrollY: window.scrollY })
        );

        // Optional: Expose the log to the parent for debugging
        window.parent.postMessage({ type: 'log-ready', data: urlLog }, '*');
      })();
    </script>
  `;
  return html.replace('</head>', `${trackingScript}</head>`);
};
// Utility function to rewrite URLs in HTML responses
function rewriteUrls(htmlContent: string, baseUrl: string): string {
  const baseOrigin = new URL(baseUrl).origin;

  return injectTrackingScript(htmlContent)
    .replace(/(href|src)="([^"]*)"/g, (match, attr, url) => {
      try {
        const parsedUrl = new URL(url, baseUrl);
        if (parsedUrl.origin !== baseOrigin) return match;

        const originalUrl = parsedUrl.href;
        const proxiedUrl = `/proxy?url=${encodeURIComponent(originalUrl)}&origin=${encodeURIComponent(baseOrigin)}`;
        return `${attr}="${proxiedUrl}"`;
      } catch (error) {
        console.warn(`Invalid URL detected: ${url}`);
        return match;
      }
    })
}

// Loader function using `fetch` to proxy requests
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const targetUrl = decodeURIComponent(url.searchParams.get("url") || "");
  const origin = url.searchParams.get("origin") || "unknown-origin";

  if (!targetUrl) {
    return json({ error: "Missing URL parameter" }, { status: 400 });
  }

  console.log(`Proxying request to: ${targetUrl} from origin: ${origin}`);

  try {
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      const htmlBody = await response.text();
      const rewrittenHtml = rewriteUrls(htmlBody, targetUrl);
      return new Response(rewrittenHtml, {
        status: response.status,
        headers: { "Content-Type": "text/html" },
      });
    } else {
      const body = await response.arrayBuffer(); // Handle binary data
      return new Response(body, {
        status: response.status,
        headers: { "Content-Type": contentType },
      });
    }
  } catch (error) {
    console.error("Error fetching target URL:", error);
    return new Response("Error fetching content", { status: 500 });
  }
};