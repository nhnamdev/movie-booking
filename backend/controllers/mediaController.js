const { pipeline } = require("stream/promises");

const createMediaController = ({ getFromR2 }) => {
  const getMedia = async (req, res) => {
    try {
      const object = await getFromR2(`${req.params.folder}/${req.params.fileName}`);

      res.setHeader("Content-Type", object.ContentType || "application/octet-stream");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      if (object.ContentLength != null) res.setHeader("Content-Length", object.ContentLength);
      if (object.ETag) res.setHeader("ETag", object.ETag);

      await pipeline(object.Body, res);
    } catch (error) {
      if (res.headersSent) return res.end();
      if (error.code === "INVALID_MEDIA_KEY" || error.name === "NoSuchKey") {
        return res.status(404).json({ message: "Không tìm thấy ảnh" });
      }
      console.error("Read R2 image error:", error);
      return res.status(500).json({ message: "Không thể tải ảnh" });
    }
  };

  return { getMedia };
};

module.exports = createMediaController;
