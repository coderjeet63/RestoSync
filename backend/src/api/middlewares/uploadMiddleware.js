import path from 'node:path';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../../config/cloudinary.js';

const IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
]);

const sanitizeFileName = (value = 'menu-item') => {
    const sanitizedValue = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);

    return sanitizedValue || 'menu-item';
};

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const restaurantId = String(req.user?.restaurantId ?? 'shared');
        const originalFileName = path.parse(file.originalname ?? 'menu-item').name;

        return {
            folder: `restosync_menus/${restaurantId}`,
            public_id: `${sanitizeFileName(originalFileName)}-${Date.now()}`,
            resource_type: 'image',
        };
    },
});

const fileFilter = (req, file, callback) => {
    if (IMAGE_MIME_TYPES.has(file.mimetype)) {
        callback(null, true);
        return;
    }

    callback(new Error('Only JPG, JPEG, PNG, and WEBP image uploads are allowed.'));
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});
