import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

export const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error", {
            folder,
            message: error.message,
            request_id: error.request_id
          });
          return reject(error);
        }
        console.log("Cloudinary upload success", {
          folder,
          secure_url: result.secure_url
        });
        resolve(result);
      }
    );
    const readable = new Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
};
