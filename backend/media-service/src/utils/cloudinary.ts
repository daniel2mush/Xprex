import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { MediaType } from "@social/db";
import { env } from "../env";

// Initialize once on module load
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

interface UploadResult {
  url: string;
  publicId: string;
  type: MediaType;
  width?: number;
  height?: number;
  size: number;
}

export const uploadToCloudinary = (
  buffer: Buffer,
  mimetype: string,
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const isVideo = mimetype.startsWith("video/");
    const resourceType = isVideo ? "video" : "image";
    const mediaType = isVideo
      ? MediaType.VIDEO
      : mimetype === "image/gif"
        ? MediaType.GIF
        : MediaType.IMAGE;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: "social-app",
        transformation: isVideo
          ? [{ quality: "auto" }, { fetch_format: "auto" }]
          : [
              { quality: "auto" },
              { fetch_format: "auto" },
              { width: 1200, crop: "limit" },
            ],
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(error ?? new Error("Cloudinary upload failed"));
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          type: mediaType,
          width: result.width,
          height: result.height,
          size: result.bytes,
        });
      },
    );

    uploadStream.end(buffer);
  });
};

export const deleteFromCloudinary = async (
  publicId: string,
  isVideo = false,
): Promise<void> => {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: isVideo ? "video" : "image",
  });
};
