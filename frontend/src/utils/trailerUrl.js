export const getYouTubeVideoId = (value) => {
  const rawUrl = String(value || "").trim();
  if (!rawUrl) return "";

  try {
    const parsedUrl = new URL(rawUrl);
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    let videoId = "";

    if (hostname === "youtu.be") {
      videoId = parsedUrl.pathname.split("/").filter(Boolean)[0] || "";
    } else if (["youtube.com", "m.youtube.com"].includes(hostname)) {
      const segments = parsedUrl.pathname.split("/").filter(Boolean);
      if (parsedUrl.pathname === "/watch") videoId = parsedUrl.searchParams.get("v") || "";
      else if (["embed", "shorts", "live"].includes(segments[0])) videoId = segments[1] || "";
    }

    return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : "";
  } catch (_error) {
    return "";
  }
};

export const getYouTubeEmbedUrl = (value) => {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0` : "";
};
