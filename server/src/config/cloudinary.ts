import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary Storage for Multer
export const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'bt-tickets',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'],
        transformation: [{ width: 2000, crop: 'limit' }] // Otimizar imagens grandes
    } as any
});

export default cloudinary;
