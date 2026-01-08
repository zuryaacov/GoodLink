var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
function extractSlug(pathname) {
  const path = pathname.replace(/^\//, "").split("?")[0].split("#")[0];
  if (!path || path === "" || path === "index.html" || path.startsWith("api/")) {
    return null;
  }
  const slugPattern = /^[a-z0-9-]{3,30}$/i;
  if (!slugPattern.test(path)) {
    return null;
  }
  return path.toLowerCase();
}
__name(extractSlug, "extractSlug");
function buildTargetUrl(targetUrl, linkData, requestUrl) {
  try {
    const target = new URL(targetUrl);
    const requestParams = new URLSearchParams(requestUrl.search);
    if (linkData.utm_source) {
      target.searchParams.set("utm_source", linkData.utm_source);
    }
    if (linkData.utm_medium) {
      target.searchParams.set("utm_medium", linkData.utm_medium);
    }
    if (linkData.utm_campaign) {
      target.searchParams.set("utm_campaign", linkData.utm_campaign);
    }
    if (linkData.utm_content) {
      target.searchParams.set("utm_content", linkData.utm_content);
    }
    if (linkData.parameter_pass_through) {
      for (const [key, value] of requestParams.entries()) {
        if (!["utm_source", "utm_medium", "utm_campaign", "utm_content"].includes(key)) {
          target.searchParams.set(key, value);
        }
      }
    }
    return target.toString();
  } catch (error) {
    console.error("Error building target URL:", error);
    return targetUrl;
  }
}
__name(buildTargetUrl, "buildTargetUrl");
async function getLinkFromSupabase(slug, domain, supabaseUrl, supabaseKey) {
  try {
    const queryUrl = `${supabaseUrl}/rest/v1/links?slug=eq.${encodeURIComponent(slug)}&domain=eq.${encodeURIComponent(domain)}&select=target_url,parameter_pass_through,utm_source,utm_medium,utm_campaign,utm_content,status`;
    console.log(`Querying Supabase: ${queryUrl}`);
    console.log(`Search params: slug="${slug}", domain="${domain}"`);
    const response = await fetch(queryUrl, {
      method: "GET",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supabase query failed: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorText}`);
      return null;
    }
    const data = await response.json();
    console.log(`Supabase returned ${data?.length || 0} result(s)`);
    if (data && data.length > 0) {
      console.log(`Found link:`, JSON.stringify(data[0], null, 2));
    }
    if (!data || data.length === 0) {
      console.log(`No link found with slug="${slug}" and domain="${domain}"`);
      const debugUrl = `${supabaseUrl}/rest/v1/links?slug=eq.${encodeURIComponent(slug)}&select=id,slug,domain,status,target_url`;
      const debugResponse = await fetch(debugUrl, {
        method: "GET",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        }
      });
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        if (debugData && debugData.length > 0) {
          console.log(`Debug: Found ${debugData.length} link(s) with slug "${slug}" but different domain:`);
          debugData.forEach((link2) => {
            console.log(`  - id: ${link2.id}, domain: "${link2.domain}", slug: "${link2.slug}", status: ${link2.status !== void 0 ? link2.status : "N/A"}`);
          });
          const foundLink = debugData.find(
            (l) => (l.status === void 0 || l.status === true) && l.target_url
          );
          if (foundLink) {
            console.log(`Warning: Using link with domain "${foundLink.domain}" instead of requested "${domain}"`);
            return {
              target_url: foundLink.target_url,
              parameter_pass_through: true,
              // Default if not found
              utm_source: null,
              utm_medium: null,
              utm_campaign: null,
              utm_content: null,
              status: foundLink.status
            };
          }
        } else {
          console.log(`Debug: No links found with slug "${slug}" at all`);
        }
      } else {
        console.log(`Debug query failed: ${debugResponse.status}`);
      }
      return null;
    }
    const link = data[0];
    if (link.status !== void 0 && link.status === false) {
      console.log(`Link found but status is false (inactive)`);
      return null;
    }
    return link;
  } catch (error) {
    console.error("Error querying Supabase:", error);
    console.error("Error stack:", error.stack);
    return null;
  }
}
__name(getLinkFromSupabase, "getLinkFromSupabase");
var index_default = {
  async fetch(request, env) {
    try {
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Missing Supabase configuration");
        return new Response("Service configuration error", { status: 500 });
      }
      const url = new URL(request.url);
      const hostname = url.hostname;
      const pathname = url.pathname;
      console.log(`Request URL: ${request.url}`);
      console.log(`Hostname: ${hostname}, Pathname: ${pathname}`);
      const slug = extractSlug(pathname);
      console.log(`Extracted slug: ${slug}`);
      if (!slug) {
        console.log("No valid slug found in pathname");
        return new Response("Link not found", {
          status: 404,
          headers: {
            "Content-Type": "text/plain"
          }
        });
      }
      const domain = hostname.replace(/^www\./, "");
      console.log(`Looking up link: slug="${slug}", domain="${domain}"`);
      const linkData = await getLinkFromSupabase(
        slug,
        domain,
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );
      if (!linkData || !linkData.target_url) {
        return new Response("Link not found", {
          status: 404,
          headers: {
            "Content-Type": "text/plain"
          }
        });
      }
      const finalUrl = buildTargetUrl(linkData.target_url, linkData, url);
      console.log(`Redirecting to: ${finalUrl}`);
      return Response.redirect(finalUrl, 301);
    } catch (error) {
      console.error("Worker error:", error);
      return new Response("Internal server error", {
        status: 500,
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
