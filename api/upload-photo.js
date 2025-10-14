// api/upload-photo.js
// Uses ImgBB for image hosting

// Configure Vercel to parse JSON bodies
export const config = {
    api: {
        bodyParser: true, // Enable automatic body parsing
    },
};

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

    console.log('Environment check:', {
        hasAirtablePAT: !!AIRTABLE_TOKEN,
        hasImgBBKey: !!IMGBB_API_KEY
    });

    if (!AIRTABLE_TOKEN) {
        console.error('AIRTABLE_PAT not configured');
        return res.status(500).json({ error: 'Missing AIRTABLE_PAT' });
    }

    if (!IMGBB_API_KEY) {
        console.error('IMGBB_API_KEY not configured');
        return res.status(500).json({ error: 'Missing IMGBB_API_KEY' });
    }

    try {
        console.log('Request body type:', typeof req.body);
        console.log('Request body keys:', req.body ? Object.keys(req.body) : 'null');

        const { projectId, photoType, imageBase64 } = req.body || {};

        console.log('Received upload request:', { 
            projectId, 
            photoType, 
            hasImage: !!imageBase64,
            imageLength: imageBase64 ? imageBase64.length : 0
        });

        if (!projectId || !photoType || !imageBase64) {
            console.error('Missing fields');
            return res.status(400).json({ 
                error: 'Missing required fields',
                received: { 
                    hasProjectId: !!projectId, 
                    hasPhotoType: !!photoType, 
                    hasImageBase64: !!imageBase64 
                }
            });
        }

        console.log('Processing photo upload for project:', projectId);

        // Remove the data:image/...;base64, prefix if present
        const base64Data = imageBase64.includes(',') 
            ? imageBase64.split(',')[1] 
            : imageBase64;

        console.log('Base64 data length:', base64Data.length);

        // Upload to ImgBB
        const imgbbFormData = new URLSearchParams();
        imgbbFormData.append('image', base64Data);
        
        console.log('Uploading to ImgBB...');
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

        console.log('ImgBB response status:', imgbbResponse.status);

        if (!imgbbResponse.ok) {
            const errorText = await imgbbResponse.text();
            console.error('ImgBB error:', errorText);
            throw new Error('Failed to upload to ImgBB: ' + errorText);
        }

        const imgbbData = await imgbbResponse.json();
        
        if (!imgbbData.success) {
            console.error('ImgBB upload failed:', imgbbData);
            throw new Error('ImgBB did not return success');
        }

        const imageUrl = imgbbData.data.url;
        console.log('Image uploaded successfully to:', imageUrl);

        // Create photo record in Airtable
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

        console.log('Airtable response status:', airtableResponse.status);

        if (!airtableResponse.ok) {
            const errorData = await airtableResponse.json();
            console.error('Airtable error:', errorData);
            throw new Error('Failed to create Airtable record: ' + JSON.stringify(errorData));
        }

        const result = await airtableResponse.json();
        console.log('✅ Photo record created successfully:', result.id);

        return res.status(200).json({
            success: true,
            photoId: result.id,
            imageUrl: imageUrl
        });

    } catch (error) {
        console.error('❌ Upload error:', error.message);
        console.error('Stack:', error.stack);
        return res.status(500).json({
            error: 'Failed to upload photo',
            message: error.message
        });
    }
}
