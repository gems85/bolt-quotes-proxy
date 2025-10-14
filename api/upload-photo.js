// api/upload-photo.js
// Uses ImgBB for image hosting

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
    const BASE_ID = 'applWK4PXoo86ajvD';
    const PHOTOS_TABLE = 'Photos';

    if (!AIRTABLE_TOKEN) {
        console.error('AIRTABLE_PAT not configured');
        return res.status(500).json({ error: 'Missing AIRTABLE_PAT' });
    }

    if (!IMGBB_API_KEY) {
        console.error('IMGBB_API_KEY not configured');
        return res.status(500).json({ error: 'Missing IMGBB_API_KEY' });
    }

    try {
        // Vercel automatically parses JSON bodies
        const { projectId, photoType, imageBase64 } = req.body || {};

        console.log('Received upload request:', { 
            projectId, 
            photoType, 
            hasImage: !!imageBase64,
            bodyType: typeof req.body
        });

        if (!projectId || !photoType || !imageBase64) {
            console.error('Missing fields:', { 
                projectId: !!projectId, 
                photoType: !!photoType, 
                imageBase64: !!imageBase64 
            });
            return res.status(400).json({ 
                error: 'Missing required fields',
                received: { projectId: !!projectId, photoType: !!photoType, imageBase64: !!imageBase64 }
            });
        }

        console.log('Uploading photo:', { projectId, photoType });

        // Remove the data:image/...;base64, prefix if present
        const base64Data = imageBase64.includes(',') 
            ? imageBase64.split(',')[1] 
            : imageBase64;

        // Upload to ImgBB
        const imgbbFormData = new URLSearchParams();
        imgbbFormData.append('image', base64Data);
        
        console.log('Sending to ImgBB...');
        const imgbbResponse = await fetch(
            `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: imgbbFormData
            }
        );

        const imgbbText = await imgbbResponse.text();
        console.log('ImgBB response status:', imgbbResponse.status);
        console.log('ImgBB response:', imgbbText.substring(0, 200));

        if (!imgbbResponse.ok) {
            console.error('ImgBB error:', imgbbText);
            throw new Error('Failed to upload image to ImgBB: ' + imgbbText);
        }

        const imgbbData = JSON.parse(imgbbText);
        
        if (!imgbbData.success) {
            console.error('ImgBB upload failed:', imgbbData);
            throw new Error('ImgBB upload was not successful');
        }

        const imageUrl = imgbbData.data.url;
        console.log('Image uploaded to:', imageUrl);

        // Create photo record in Airtable with the image URL
        const airtableData = {
            fields: {
                'Project': [projectId],
                'Photo Type': photoType,
                'Uploaded By': 'Homeowner',
                'Photos': [{ url: imageUrl }]
            }
        };

        console.log('Creating Airtable record...');
        const airtableResponse = await fetch(
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

        if (!airtableResponse.ok) {
            const errorData = await airtableResponse.json();
            console.error('Airtable error:', errorData);
            throw new Error('Failed to create photo record in Airtable: ' + JSON.stringify(errorData));
        }

        const result = await airtableResponse.json();
        console.log('Photo record created successfully:', result.id);

        return res.status(200).json({
            success: true,
            photoId: result.id,
            imageUrl: imageUrl
        });

    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({
            error: 'Failed to upload photo',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
