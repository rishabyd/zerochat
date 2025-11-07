import { tool } from "ai";
import { z } from "zod";

export const apiDebugger = tool({
  description:
    "Make real HTTP requests to any API endpoint. Test with different headers, params, and request bodies. Debug API integrations and understand response structures. Shows status codes, response headers, timing, and body.",
  inputSchema: z.object({
    url: z.string().url("Invalid URL format").describe("Full API endpoint URL"),
    method: z
      .enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
      .default("GET")
      .describe("HTTP method"),
    headers: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        "Request headers (e.g., { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' })",
      ),
    body: z
      .string()
      .optional()
      .describe("Request body (for POST/PUT/PATCH). Should be JSON string."),
    query_params: z
      .record(z.string(), z.string())
      .optional()
      .describe("URL query parameters"),
    timeout: z
      .number()
      .optional()
      .default(10000)
      .describe("Request timeout in milliseconds"),
  }),
  execute: async ({
    url,
    method = "GET",
    headers = {},
    body,
    query_params = {},
    timeout = 10000,
  }) => {
    try {
      console.log(`🔍 API Debugger: ${method} ${url}`);

      // Build full URL with query params
      const fullUrl = new URL(url);
      Object.entries(query_params).forEach(([key, value]) => {
        fullUrl.searchParams.append(key, value);
      });

      console.log(`📍 Full URL: ${fullUrl.toString()}`);
      console.log(`📦 Headers:`, headers);
      if (body) console.log(`📄 Body:`, body);

      const startTime = Date.now();

      // Make the request
      const response = await fetch(fullUrl.toString(), {
        method,
        headers: {
          "User-Agent": "DevAssistant/1.0 (API Debugger)",
          ...headers,
        },
        ...(body && { body }),
        signal: AbortSignal.timeout(timeout),
      });

      const duration = Date.now() - startTime;

      // Get response body
      const contentType = response.headers.get("content-type");
      let responseBody: unknown;

      if (contentType?.includes("application/json")) {
        try {
          responseBody = await response.json();
        } catch {
          responseBody = await response.text();
        }
      } else if (contentType?.includes("text")) {
        responseBody = await response.text();
      } else {
        responseBody = await response.arrayBuffer();
      }

      // Extract useful headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      console.log(`✅ Response (${response.status}) - ${duration}ms`);

      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        url: fullUrl.toString(),
        method,
        duration_ms: duration,
        headers: {
          request: headers,
          response: responseHeaders,
        },
        body: responseBody,
        contentType,
        size: JSON.stringify(responseBody).length,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("❌ API Debugger error:", errorMsg);

      return {
        success: false,
        error: errorMsg,
        url,
        method,
        hint: getErrorHint(errorMsg),
      };
    }
  },
});

function getErrorHint(error: string): string {
  if (error.includes("timeout")) {
    return "Request timed out. API might be slow or unresponsive. Try increasing timeout.";
  }
  if (error.includes("ERR_INVALID_URL")) {
    return "Invalid URL format. Make sure to include http:// or https://";
  }
  if (error.includes("CORS")) {
    return "CORS error - endpoint might not allow cross-origin requests. Try from backend/Postman.";
  }
  if (error.includes("ERR_TLS_CERT_ALTNAME_INVALID")) {
    return "SSL certificate issue. Verify the domain is correct.";
  }
  if (error.includes("ECONNREFUSED")) {
    return "Connection refused. API endpoint might be down or wrong host.";
  }
  return "Check endpoint URL, headers, and request body.";
}
