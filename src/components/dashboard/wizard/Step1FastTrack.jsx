import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { checkUrlSafety } from "../../../lib/urlSafetyCheck";
import { validateUrl } from "../../../lib/urlValidation";
import { validateSlug, validateSlugFormat } from "../../../lib/slugValidation";

// Utility function to fetch page title from URL with timeout
const fetchPageTitle = async (url, timeoutMs = 3000) => {
  try {
    // Validate URL first
    new URL(url);

    // Use a CORS proxy to fetch the page with timeout
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
      url
    )}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(proxyUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to fetch page");
      }

      const data = await response.json();

      if (data.contents) {
        // Parse HTML to extract title
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, "text/html");
        const title = doc.querySelector("title")?.textContent || "";
        return title.trim();
      }
      return "";
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        throw new Error("Timeout");
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Error fetching page title:", error);
    // Return empty string on error - user can manually enter name
    return "";
  }
};

const Step1FastTrack = ({
  formData,
  updateFormData,
  onQuickCreate,
  onSafetyCheckUpdate,
}) => {
  const [domains, setDomains] = useState(["glynk.to"]);
  const [hasCustomDomains, setHasCustomDomains] = useState(false);
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugError, setSlugError] = useState(null);
  const [isSlugAvailable, setIsSlugAvailable] = useState(null); // null = not checked, true = available, false = taken
  const [lastSlugCheck, setLastSlugCheck] = useState(null); // Track last check time for debouncing
  const [nameError, setNameError] = useState(null); // Error for name validation
  const [isNameAvailable, setIsNameAvailable] = useState(null); // null = not checked, true = available, false = taken
  const [urlError, setUrlError] = useState(null); // Error for URL validation
  const [safetyCheck, setSafetyCheck] = useState({
    loading: false,
    isSafe: null,
    threatType: null,
    error: null,
    urlExists: false, // Track if URL already exists in links table
  });

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // Try to fetch from domains table first
          const { data: customDomains, error: domainsError } = await supabase
            .from("domains")
            .select("domain")
            .eq("user_id", user.id)
            .neq("domain", "glynk.to");

          if (!domainsError && customDomains && customDomains.length > 0) {
            // User has custom domains - show all options including default
            const customDomainList = customDomains.map((d) => d.domain);
            setDomains(["glynk.to", ...customDomainList]);
            setHasCustomDomains(true);
          } else {
            // No custom domains table or no custom domains found
            // Check if user has any links with custom domains in links table
            const { data: linksWithCustomDomains, error: linksError } =
              await supabase
                .from("links")
                .select("domain")
                .eq("user_id", user.id)
                .neq("domain", "glynk.to")
                .limit(1);

            if (
              !linksError &&
              linksWithCustomDomains &&
              linksWithCustomDomains.length > 0
            ) {
              // User has used custom domains before - get all unique domains
              const { data: allDomains } = await supabase
                .from("links")
                .select("domain")
                .eq("user_id", user.id);

              if (allDomains && allDomains.length > 0) {
                const uniqueDomains = [
                  ...new Set(allDomains.map((l) => l.domain)),
                ];
                setDomains(uniqueDomains);
                setHasCustomDomains(true);
              } else {
                // No custom domains - hide the section
                setDomains(["glynk.to"]);
                setHasCustomDomains(false);
              }
            } else {
              // No custom domains - hide the section
              setDomains(["glynk.to"]);
              setHasCustomDomains(false);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching domains:", error);
        // On error, default to hiding custom domain selection
        setDomains(["glynk.to"]);
        setHasCustomDomains(false);
      }
    };
    fetchDomains();
  }, []);

  // Safety check function that returns the result (for use in handleCheckSlug)
  const performSafetyCheckAndGetResult = async () => {
    if (!formData.targetUrl || !formData.targetUrl.trim()) {
      const result = {
        isSafe: false,
        urlExists: false,
        error: "URL is required",
      };
      setSafetyCheck({
        loading: false,
        isSafe: null,
        threatType: null,
        error: null,
        urlExists: false,
      });
      return result;
    }

    // Comprehensive URL validation BEFORE making API calls
    const validation = validateUrl(formData.targetUrl);

    if (!validation.isValid) {
      const result = {
        isSafe: false,
        urlExists: false,
        error: validation.error || "Invalid URL format",
      };
      setSafetyCheck({
        loading: false,
        isSafe: null,
        threatType: null,
        error: validation.error || "Invalid URL format",
        urlExists: false,
      });
      return result;
    }

    // Use normalized URL from validation
    const normalizedUrl = validation.normalizedUrl;

    // Check if URL is pointing to glynk.to (not allowed - cannot redirect to own domain)
    try {
      const urlObj = new URL(normalizedUrl);
      const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, "");

      if (hostname === "glynk.to") {
        const result = {
          isSafe: false,
          urlExists: false,
          error: "Redirect cannot be to glynk.to. Please use a different URL.",
        };
        setSafetyCheck({
          loading: false,
          isSafe: false,
          threatType: null,
          error: "Redirect cannot be to glynk.to. Please use a different URL.",
          urlExists: false,
        });
        return result;
      }
    } catch (error) {
      // If URL parsing fails, continue with normal validation
      console.error("Error checking glynk.to domain:", error);
    }

    // Perform safety check with normalized URL (only if validation passed)
    setSafetyCheck((prev) => ({ ...prev, loading: true }));
    const result = await checkUrlSafety(normalizedUrl);

    // Check if URL already exists in links table (check always, not just if safe)
    let urlExists = false;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Get all links for this user to check for URL matches (exclude deleted links)
        const { data: existingLinks, error: linksError } = await supabase
          .from("links")
          .select("id, target_url")
          .eq("user_id", user.id)
          .neq("status", "deleted");

        if (!linksError && existingLinks && existingLinks.length > 0) {
          // Normalize URLs for comparison (remove trailing slashes, lowercase, etc.)
          const normalizeForComparison = (url) => {
            if (!url || typeof url !== "string") return "";

            try {
              let urlToNormalize = url.trim().toLowerCase();

              // Add https:// if no protocol
              if (
                !urlToNormalize.startsWith("http://") &&
                !urlToNormalize.startsWith("https://")
              ) {
                urlToNormalize = `https://${urlToNormalize}`;
              }

              // Parse as URL
              const urlObj = new URL(urlToNormalize);

              // Build normalized URL: protocol + hostname (without www) + pathname (without trailing slash)
              let normalized = `${urlObj.protocol}//${urlObj.hostname.replace(
                /^www\./,
                ""
              )}`;

              // Add pathname without trailing slash
              if (urlObj.pathname && urlObj.pathname !== "/") {
                normalized += urlObj.pathname.replace(/\/$/, "");
              }

              // Add search params if they exist
              if (urlObj.search) {
                normalized += urlObj.search;
              }

              return normalized;
            } catch {
              // Fallback: just lowercase and trim, remove trailing slash
              return url.toLowerCase().trim().replace(/\/$/, "");
            }
          };

          const normalizedInputUrl = normalizeForComparison(normalizedUrl);

          // Check if any existing link matches the normalized URL
          // Exclude the current link if in edit mode (formData.linkId)
          urlExists = existingLinks.some((link) => {
            // Skip if this is the link we're editing (compare as strings to handle UUID comparison)
            if (formData.linkId && String(link.id) === String(formData.linkId)) {
              return false;
            }
            if (!link.target_url) return false;
            const normalizedExistingUrl = normalizeForComparison(
              link.target_url
            );
            return normalizedExistingUrl === normalizedInputUrl;
          });
        }
      }
    } catch (error) {
      console.error("Error checking if URL exists:", error);
      // Don't block user on error, just log it
    }

    const safetyState = {
      loading: false,
      isSafe: result.isSafe && !urlExists, // URL is safe only if it's safe AND doesn't exist
      threatType: result.threatType,
      error: urlExists
        ? "This URL already exists in your links. Please use a different URL."
        : result.error || null,
      urlExists: urlExists,
    };
    setSafetyCheck(safetyState);

    // Update parent component with safety check result
    if (onSafetyCheckUpdate) {
      onSafetyCheckUpdate({
        isSafe: result.isSafe && !urlExists,
        threatType: result.threatType,
      });
    }

    return {
      isSafe: result.isSafe && !urlExists,
      urlExists: urlExists,
      error: urlExists
        ? "This URL already exists in your links. Please use a different URL."
        : result.error || null,
    };
  };

  // Safety check function - called when user leaves the field (for UI updates only)
  const performSafetyCheck = async () => {
    await performSafetyCheckAndGetResult();
  };

  // Auto-fetch title function - called when user leaves the field
  const fetchTitle = async () => {
    if (!formData.targetUrl || !formData.targetUrl.trim()) {
      setFetchingTitle(false);
      // Clear name if URL is empty
      if (formData.name && formData.name.trim()) {
        updateFormData("name", "");
      }
      return;
    }

    // Comprehensive URL validation BEFORE making API calls
    const validation = validateUrl(formData.targetUrl);

    if (!validation.isValid) {
      setFetchingTitle(false);
      return;
    }

    // Use normalized URL from validation
    const normalizedUrl = validation.normalizedUrl;

    // Fetch title only if validation passed
    try {
      setFetchingTitle(true);
      const title = await fetchPageTitle(normalizedUrl, 3000);
      if (title && title.trim()) {
        updateFormData("name", title.trim());
      } else {
        // If no title found, extract domain name from URL
        try {
          const urlObj = new URL(normalizedUrl);
          const domainName = urlObj.hostname.replace("www.", "").split(".")[0];
          // Capitalize first letter
          const capitalizedDomain = domainName.charAt(0).toUpperCase() + domainName.slice(1);
          updateFormData("name", capitalizedDomain);
        } catch {
          // If still fails, leave empty - user must enter name manually
        }
      }
    } catch (error) {
      // Invalid URL or timeout, extract domain name from URL
      console.log("Error fetching title:", error);
      try {
        const urlObj = new URL(normalizedUrl);
        const domainName = urlObj.hostname.replace("www.", "").split(".")[0];
        // Capitalize first letter
        const capitalizedDomain = domainName.charAt(0).toUpperCase() + domainName.slice(1);
        updateFormData("name", capitalizedDomain);
      } catch {
        // If still fails, leave empty - user must enter name manually
      }
    } finally {
      setFetchingTitle(false);
    }
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    updateFormData("targetUrl", url);

    // Clear URL error when user types
    if (urlError) {
      setUrlError(null);
    }

    // Reset name when URL changes (will be auto-filled again by useEffect)
    if (url && url !== formData.targetUrl) {
      updateFormData("name", "");
    }
  };

  const handleUrlPaste = () => {
    // Let the onChange handler deal with it
    // The useEffect will automatically fetch the title
  };

  // Check if name already exists for this user
  const checkNameAvailability = async (name, userId, excludeLinkId = null) => {
    try {
      if (!name || !name.trim()) {
        return { isAvailable: false, error: "Name is required" };
      }

      let query = supabase
        .from("links")
        .select("id, name")
        .eq("user_id", userId)
        .eq("name", name.trim())
        .neq("status", "deleted");

      // Exclude the current link if in edit mode
      if (excludeLinkId) {
        query = query.neq("id", excludeLinkId);
      }

      const { data: existingLinks, error } = await query.limit(1);

      if (error) {
        console.error("Error checking name availability:", error);
        return { isAvailable: false, error: "Error checking name availability" };
      }

      if (existingLinks && existingLinks.length > 0) {
        return {
          isAvailable: false,
          error: "This name already exists in your links. Please use a different name.",
        };
      }

      return { isAvailable: true };
    } catch (error) {
      console.error("Error checking name availability:", error);
      return { isAvailable: false, error: "Error checking name availability" };
    }
  };

  const handleCheckSlug = async () => {
    // Clear previous errors
    setUrlError(null);
    setSlugError(null);
    setNameError(null);
    setIsSlugAvailable(null);
    setIsNameAvailable(null);

    // Validate required fields before starting checks
    if (!formData.targetUrl || !formData.targetUrl.trim()) {
      setUrlError("Please enter a URL before checking");
      return;
    }

    if (!formData.name || !formData.name.trim()) {
      setNameError("Please enter a name before checking");
      return;
    }

    if (!formData.slug || !formData.slug.trim()) {
      setSlugError("Please enter a slug before checking");
      return;
    }

    // Debouncing: Don't check the same slug too frequently (wait at least 2 seconds)
    const now = Date.now();
    const slugToCheck = formData.slug.trim().toLowerCase();
    if (
      lastSlugCheck &&
      lastSlugCheck.slug === slugToCheck &&
      now - lastSlugCheck.timestamp < 2000
    ) {
      console.log("⏸️ Debouncing: Skipping check (too soon after last check)");
      return;
    }

    const selectedDomain = formData.domain || domains[0];

    setCheckingSlug(true);
    setLastSlugCheck({ slug: slugToCheck, timestamp: now });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUrlError("You must be logged in to check availability");
        setIsSlugAvailable(null);
        setCheckingSlug(false);
        return;
      }

      // Step 1: Check URL - ALL URL validations
      console.log("🔵 [Check] Step 1: Checking URL (all validations)...");
      
      // Perform safety check and get the result
      const safetyCheckResult = await performSafetyCheckAndGetResult();
      
      // Check all URL validations before proceeding
      if (!safetyCheckResult.isSafe || safetyCheckResult.urlExists) {
        setUrlError(
          safetyCheckResult.urlExists 
            ? "This URL already exists in your links. Please use a different URL."
            : safetyCheckResult.error || "URL validation failed. Please fix the URL before continuing."
        );
        setCheckingSlug(false);
        return;
      }

      // URL is valid - clear any previous errors
      setUrlError(null);

      // Step 2: Check Name - ALL Name validations
      console.log("🔵 [Check] Step 2: Checking Name (all validations)...");
      
      // Check name availability
      const nameCheck = await checkNameAvailability(
        formData.name,
        user.id,
        formData.linkId || null
      );

      // Check all name validations before proceeding
      if (!nameCheck.isAvailable) {
        setNameError(nameCheck.error || "Name is not available");
        setIsNameAvailable(false);
        setCheckingSlug(false);
        return;
      }

      // Name is valid - clear any previous errors and mark as available
      setIsNameAvailable(true);
      setNameError(null);

      // Step 3: Check SLUG - ALL SLUG validations
      console.log("🔵 [Check] Step 3: Checking SLUG (all validations)...");
      
      // Perform all slug validations: format, availability, content moderation
      const validationResult = await validateSlug(
        formData.slug,
        selectedDomain,
        user.id,
        supabase,
        true, // check availability
        true, // check content moderation
        formData.linkId || null // exclude current link ID if in edit mode
      );

      // Check all slug validations
      if (!validationResult.isValid) {
        setSlugError(validationResult.error || "Invalid slug");
        setIsSlugAvailable(false);
        setCheckingSlug(false);
        return;
      }

      // All validations passed - update form data with normalized slug (lowercase)
      if (
        validationResult.normalizedSlug &&
        validationResult.normalizedSlug !== formData.slug
      ) {
        updateFormData("slug", validationResult.normalizedSlug);
      }

      // Slug is valid and available - clear any previous errors
      setSlugError(null);
      setIsSlugAvailable(true);
      
      console.log("✅ [Check] All validations passed!");
    } catch (error) {
      console.error("Error during validation:", error);
      setSlugError("Error during validation. Please try again.");
      setIsSlugAvailable(null);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleDomainSelect = (domain) => {
    updateFormData("domain", domain);
  };

  // Show "Create Quick Link" button only when:
  // 1. URL is verified (safety check passed)
  // 2. Name is provided and verified (name check passed)
  // 3. Slug is provided and verified (slug check passed)
  const canCreate =
    formData.targetUrl &&
    formData.targetUrl.trim() &&
    safetyCheck.isSafe === true &&
    formData.name &&
    formData.name.trim() &&
    isNameAvailable === true &&
    formData.slug &&
    formData.slug.trim() &&
    isSlugAvailable === true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">The Fast Track</h3>
        <p className="text-slate-400 text-sm">Destination & Identity</p>
      </div>

      {/* Large URL Input - Google Search Style */}
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <div className="w-full max-w-2xl">
          <div className="relative">
            <input
              type="text"
              value={formData.targetUrl}
              onChange={handleUrlChange}
              onPaste={handleUrlPaste}
              onBlur={() => {
                // Only fetch title automatically, don't perform safety check
                fetchTitle();
              }}
              placeholder="Paste your URL here..."
              className={`w-full px-6 py-5 text-lg bg-[#0b0f19] border-2 rounded-2xl text-white placeholder-slate-500 focus:outline-none transition-all shadow-lg ${
                safetyCheck.isSafe === false
                  ? "border-red-500 focus:border-red-500"
                  : safetyCheck.isSafe === true
                  ? "border-green-500/50 focus:border-green-500"
                  : "border-[#232f48] focus:border-primary"
              }`}
              autoFocus
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {safetyCheck.loading && (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <span className="material-symbols-outlined animate-spin text-primary text-lg">
                    refresh
                  </span>
                  <span className="hidden sm:inline">
                    Scanning for safety...
                  </span>
                </div>
              )}
              {!safetyCheck.loading && safetyCheck.isSafe === true && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium">
                  <span className="material-symbols-outlined text-sm">
                    verified
                  </span>
                  <span className="hidden sm:inline">Secure Link</span>
                </div>
              )}
              {!safetyCheck.loading && safetyCheck.isSafe === false && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium">
                  <span className="material-symbols-outlined text-sm">
                    warning
                  </span>
                  <span className="hidden sm:inline">Unsafe</span>
                </div>
              )}
              {fetchingTitle && !safetyCheck.loading && (
                <span className="material-symbols-outlined animate-spin text-primary text-lg">
                  refresh
                </span>
              )}
            </div>
          </div>

          {/* URL Error Message */}
          {urlError && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-xs mt-2 text-left"
            >
              {urlError}
            </motion.p>
          )}

          {/* Validation Error */}
          {!safetyCheck.loading &&
            safetyCheck.error &&
            safetyCheck.isSafe === null &&
            !urlError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-yellow-500/10 border-2 border-yellow-500/50 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-yellow-400 text-xl flex-shrink-0">
                    info
                  </span>
                  <div className="flex-1">
                    <h4 className="text-yellow-400 font-bold text-sm mb-1">
                      Invalid URL Format
                    </h4>
                    <p className="text-yellow-300 text-xs">
                      {safetyCheck.error}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

          {/* Safety Warning / URL Exists Warning */}
          {!safetyCheck.loading && safetyCheck.isSafe === false && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-400 text-xl flex-shrink-0">
                  {safetyCheck.urlExists
                    ? "link_off"
                    : safetyCheck.error &&
                      safetyCheck.error.includes("glynk.to")
                    ? "block"
                    : "warning"}
                </span>
                <div className="flex-1">
                  <h4 className="text-red-400 font-bold text-sm mb-1">
                    {safetyCheck.urlExists
                      ? "URL Already Exists"
                      : safetyCheck.error &&
                        safetyCheck.error.includes("glynk.to")
                      ? "Invalid Redirect Target"
                      : "Unsafe Link Detected"}
                  </h4>
                  <p className="text-red-300 text-xs">
                    {safetyCheck.urlExists
                      ? safetyCheck.error ||
                        "This URL already exists in your links. Please use a different URL."
                      : safetyCheck.error &&
                        safetyCheck.error.includes("glynk.to")
                      ? safetyCheck.error
                      : `This URL has been flagged as ${
                          safetyCheck.threatType || "potentially unsafe"
                        } by Google Safe Browsing. We recommend not using this link for security reasons.`}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Name input (appears when URL is entered, shows during fetch and after) */}
          {(fetchingTitle || formData.name || (formData.targetUrl && formData.targetUrl.trim())) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-[#0b0f19] border border-[#232f48] rounded-xl"
            >
              <label className="block text-xs text-slate-500 mb-1">
                Internal Name <span className="text-red-400">*</span>
                {formData.name && !fetchingTitle && " (Auto-filled)"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => {
                    updateFormData("name", e.target.value);
                    // Clear name error when user types
                    if (nameError) {
                      setNameError(null);
                    }
                  }}
                  placeholder={fetchingTitle ? "Fetching title..." : "Enter name (required)"}
                  disabled={fetchingTitle}
                  required
                  className={`w-full px-3 py-2 bg-[#101622] border rounded-lg text-white text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    !formData.name && formData.targetUrl && !fetchingTitle
                      ? "border-red-500/50"
                      : "border-[#232f48]"
                  }`}
                />
                {fetchingTitle && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="material-symbols-outlined animate-spin text-primary text-sm">
                      refresh
                    </span>
                  </div>
                )}
              </div>
              {nameError && (
                <p className="text-red-400 text-xs mt-1">{nameError}</p>
              )}
              {!formData.name && formData.targetUrl && !fetchingTitle && !nameError && (
                <p className="text-red-400 text-xs mt-1">Name is required</p>
              )}
              {isNameAvailable === true && !nameError && (
                <p className="text-green-400 text-xs mt-1">✓ Name is available</p>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Slug with Magic Wand */}
      <div className="max-w-2xl mx-auto">
        <label className="block text-sm font-medium text-white mb-2">
          Slug (URL Path)
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => {
              let inputValue = e.target.value;

              // Auto-convert to lowercase
              inputValue = inputValue.toLowerCase();

              // Always update the input (allow typing)
              updateFormData("slug", inputValue);

              // Clear previous errors and reset availability when user types
              if (slugError) {
                setSlugError(null);
              }
              if (isSlugAvailable !== null) {
                setIsSlugAvailable(null); // Reset to blue/default when user changes slug
              }

              // Optional: Show format validation in real-time (but don't block)
              // Only show error if user has typed something and it's invalid
              if (inputValue.length > 0) {
                const formatCheck = validateSlugFormat(inputValue);
                if (!formatCheck.isValid) {
                  // Show error but don't block input
                  setSlugError(formatCheck.error);
                }
              }
            }}
            placeholder="e.g., iphone-deal"
            className={`flex-1 px-4 py-3 bg-[#0b0f19] border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors ${
              slugError
                ? "border-red-500 focus:border-red-500"
                : isSlugAvailable === true
                ? "border-green-500 focus:border-green-500"
                : "border-[#232f48] focus:border-primary"
            }`}
          />
          <button
            onClick={handleCheckSlug}
            disabled={checkingSlug}
            className={`px-5 py-3 rounded-xl transition-colors flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
              isSlugAvailable === true
                ? "bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400"
                : "bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary"
            }`}
            title="Check if slug is available"
          >
            {checkingSlug ? (
              <>
                <span className="material-symbols-outlined animate-spin">
                  refresh
                </span>
                <span className="hidden sm:inline">Checking...</span>
              </>
            ) : isSlugAvailable === true ? (
              <>
                <span className="material-symbols-outlined">check_circle</span>
                <span className="hidden sm:inline">Available</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">check_circle</span>
                <span className="hidden sm:inline">Check</span>
              </>
            )}
          </button>
        </div>
        {slugError ? (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400 text-xs mt-2 text-left"
          >
            {slugError}
          </motion.p>
        ) : isSlugAvailable === true ? (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-green-400 text-xs mt-2 text-left"
          >
            ✓ Slug is available!
          </motion.p>
        ) : (
          <p className="text-xs text-slate-500 mt-2">
            Enter a slug and click Check to verify availability
          </p>
        )}
      </div>

      {/* Custom Domain Chips - Only show if user has at least one custom domain */}
      {hasCustomDomains && (
        <div className="max-w-2xl mx-auto">
          <label className="block text-sm font-medium text-white mb-3">
            Custom Domain
          </label>
          <div className="flex flex-wrap gap-2">
            {domains.map((domain) => {
              const isSelected = (formData.domain || domains[0]) === domain;
              return (
                <button
                  key={domain}
                  onClick={() => handleDomainSelect(domain)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    isSelected
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "bg-[#0b0f19] border border-[#232f48] text-slate-300 hover:border-primary/50"
                  }`}
                >
                  {domain}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview */}
      {(formData.domain || domains[0]) && formData.slug && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-2xl mx-auto p-4 bg-[#0b0f19] border border-[#232f48] rounded-xl"
        >
          <p className="text-xs text-slate-500 mb-1">Preview:</p>
          <p className="text-primary font-mono text-sm break-all">
            https://{formData.domain || domains[0]}/{formData.slug}
          </p>
        </motion.div>
      )}

      {/* Quick Create/Update Button - Only on Step 1 */}
      {canCreate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto pt-4"
        >
          <button
            onClick={onQuickCreate}
            disabled={safetyCheck.isSafe === false}
            className={`w-full px-6 py-3 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${
              safetyCheck.isSafe === false
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            style={{
              backgroundColor:
                safetyCheck.isSafe === false ? undefined : "#FF10F0",
            }}
            onMouseEnter={(e) => {
              if (safetyCheck.isSafe !== false) {
                e.currentTarget.style.backgroundColor = "#e00ed0";
              }
            }}
            onMouseLeave={(e) => {
              if (safetyCheck.isSafe !== false) {
                e.currentTarget.style.backgroundColor = "#FF10F0";
              }
            }}
            title={
              safetyCheck.isSafe === false
                ? formData.linkId 
                  ? "Cannot update link with unsafe URL"
                  : "Cannot create link with unsafe URL"
                : ""
            }
          >
            <span className="material-symbols-outlined">{formData.linkId ? "save" : "bolt"}</span>
            {formData.linkId ? "Update Link" : "Create Quick Link (Skip Advanced Settings)"}
          </button>
          {!formData.linkId && (
            <p className="text-xs text-slate-500 text-center mt-2">
              You can create the link now with default settings, or continue to
              customize UTM, pixels, and security
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default Step1FastTrack;
