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