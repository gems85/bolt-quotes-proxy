// api/upload-photo.js
// Handles photo uploads to Airtable Photos table
// Uses ImgBB to host images (Airtable needs URLs for attachments)

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY; // Free image hosting
    const BASE_ID = 'applWK4PXoo86ajvD';
    const PHOTOS_TABLE = 'Photos';

    if (!AIRTABLE_TOKEN) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const { projectId, photoType, imageBase64 } = req.body;

        // Upload image to ImgBB (or any free image host)
        let imageUrl;
        
        if (IMGBB_API_KEY) {
            // Use ImgBB if API key is configured
            const formData = new FormData();
            formData.append('image', imageBase64.split(',')[1]); // Remove data:image/... prefix
            
            const imgbbResponse = await fetch(
                `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            const imgbbData = await imgbbResponse.json();
            if (!imgbbData.success) {
                throw new Error('Failed to upload image to hosting service');
            }
            
            imageUrl = imgbbData.data.url;
        } else {
            // Fallback: Store base64 temporarily (not ideal for production)
            // You should set up ImgBB or Cloudinary API key
            imageUrl = imageBase64;
        }

        // Create photo record in Airtable with image URL
        const airtableData = {
            fields: {
                'Project': [projectId],
                'Photo Type': photoType,
                'Uploaded By': 'Homeowner',
                'Photos': [
                    {
                        url: imageUrl
                    }
                ]
            }
        };

        const response = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/${PHOTOS_TABLE}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(airtableData)
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Airtable error:', errorData);
            throw new Error('Failed to create photo record in Airtable');
        }

        const result = await response.json();

        return res.status(200).json({
            success: true,
            photoId: result.id,
            imageUrl: imageUrl
        });

    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({
            error: 'Failed to upload photo',
            message: error.message
        });
    }
}
