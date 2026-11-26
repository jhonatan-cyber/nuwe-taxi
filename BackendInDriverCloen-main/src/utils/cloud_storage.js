const { Storage } = require('@google-cloud/storage');
const { randomUUID } = require('crypto');

const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });

module.exports = (file, pathImage) => {
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName || !pathImage || !file?.buffer) {
        return Promise.reject(new Error('Cloud Storage configuration or upload data is missing'));
    }

    const bucket = storage.bucket(bucketName);
    const fileUpload = bucket.file(pathImage);
    const downloadToken = randomUUID();

    return new Promise((resolve, reject) => {
        const upload = fileUpload.createWriteStream({
            metadata: {
                contentType: file.mimetype,
                metadata: { firebaseStorageDownloadTokens: downloadToken },
            },
            resumable: false,
        });

        upload.on('error', () => reject(new Error('Cloud Storage upload failed')));
        upload.on('finish', () => {
            const objectPath = encodeURIComponent(fileUpload.name);
            resolve(`https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${objectPath}?alt=media&token=${downloadToken}`);
        });
        upload.end(file.buffer);
    });
};