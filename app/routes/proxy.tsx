import { LoaderFunctionArgs, json } from "@remix-run/node";
import _request from "request";

// Custom User-Agent to mimic browser requests
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.179 Safari/537.36";

// Utility function to rewrite URLs in HTML responses
function rewriteUrls(htmlContent: string, baseUrl: string): string {
  const baseOrigin = new URL(baseUrl).origin;

  return htmlContent.replace(/(href|src)="([^"]*)"/g, (match, attr, url) => {
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
  });
}

// Loader function to handle proxy logic
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const targetUrl = decodeURIComponent(url.searchParams.get("url") || "");
  const origin = url.searchParams.get("origin") || "unknown-origin";

  if (!targetUrl) {
    return json({ error: "Missing URL parameter" }, { status: 400 });
  }

  console.log(`Proxying request to: ${targetUrl} from origin: ${origin}`);

  return new Promise<Response>((resolve, reject) => {
    _request(
      {
        url: targetUrl,
        headers: { "User-Agent": BROWSER_USER_AGENT },
        encoding: null, // Preserve binary content (images, etc.)
      },
      (error, response, body) => {
        if (error) {
          console.error("Error fetching target URL:", error);
          reject(new Response("Error fetching content", { status: 500 }));
        }

        const contentType = response.headers["content-type"];
        if (contentType && contentType.includes("text/html")) {
          const htmlBody = body.toString();
          const rewrittenHtml = rewriteUrls(htmlBody, targetUrl);
          resolve(
            new Response(rewrittenHtml, {
              status: response.statusCode,
              headers: { "Content-Type": "text/html" },
            })
          );
        } else {
          resolve(
            new Response(body, {
              status: response.statusCode,
              headers: { "Content-Type": contentType! },
            })
          );
        }
      }
    );
  });
};