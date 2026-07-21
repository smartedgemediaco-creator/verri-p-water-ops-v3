import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(
  file: Buffer,
  folder: string,
  filename: string
): Promise<{ url: string; publicId: string } | null> {
  try {
    const b64 = file.toString("base64");
    const dataURI = `data:image/jpeg;base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: `verrip/${folder}`,
      public_id: filename,
      transformation: [
        { width: 500, height: 500, crop: "limit", quality: "auto" },
      ],
    });
    return { url: result.secure_url, publicId: result.public_id };
  } catch (e) {
    console.error("Cloudinary upload failed:", e);
    return null;
  }
}

export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (e) {
    console.error("Cloudinary delete failed:", e);
    return false;
  }
}
