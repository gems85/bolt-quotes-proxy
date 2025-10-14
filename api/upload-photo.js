// api/upload-photo.js
// Uses ImgBB for image hosting

// Configure Vercel to parse JSON bodies with larger size limit
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb', // Increase from default 4.5mb to handle base64 images
        },
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

    console.log('=== Upload Photo API Called ===');
    console.log('Environment check:', {
        hasAirtablePAT: !!AIRTABLE_TOKEN,
        hasImgBBKey: !!IMGBB_API_KEY
    });

    if (!AIRTABLE_PAT) {
        console.error('AIRTABLE_PAT not configured');
        return res.status(500).json({ error: 'Missing AIRTABLE_PAT' });
    }

    if (!IMGBB_API_KEY) {
        console.error('IMGBB_API_KEY not configured');
        return res.status(500).json({ error: 'Missing IMGBB_API_KEY' });
    }

    try {
        console.log('Request body exists:', !!req.body);
        console.log('Request body type:', typeof req.body);
        
        if (req.body) {
            console.log('Request body keys:', Object.keys(req.body));
        }

        const { projectId, photoType, imageBase64 } = req.body || {};

        console.log('Extracted values:', { 
            projectId: projectId || 'MISSING', 
            photoType: photoType || 'MISSING',
            hasImage: !!imageBase64,
            imageLength: imageBase64 ? imageBase64.length : 0
        });

        if (!projectId || !photoType || !imageBase64) {
            console.error('❌ Missing required fields');
            return res.status(400).json({ 
                error: 'Missing required fields',
                received: { 
                    hasProjectId: !!projectId, 
                    hasPhotoType: !!photoType, 
                    hasImageBase64: !!imageBase64 
                }
            });
        }

        console.log('✅ All fields present. Processing upload...');

        // Remove the data:image/...;base64, prefix if present
        const base64Data = imageBase64.includes(',') 
            ? imageBase64.split(',')[1] 
            : imageBase64;

        console.log('Base64 data prepared. Length:', base64Data.length);

        // Upload to ImgBB
        const imgbbFormData = new URLSearchParams();
        imgbbFormData.append('image', base64Data);
        
        console.log('📤 Uploading to ImgBB...');
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
            console.error('❌ ImgBB error:', errorText);
            return res.status(500).json({ 
                error: 'Failed to upload to ImgBB',
                details: errorText 
            });
        }

        const imgbbData = await imgbbResponse.json();
        
        if (!imgbbData.success) {
            console.error('❌ ImgBB upload failed:', imgbbData);
            return res.status(500).json({ 
                error: 'ImgBB did not return success',
                details: imgbbData
            });
        }

        const imageUrl = imgbbData.data.url;
        console.log('✅ Image uploaded to ImgBB:', imageUrl);

        // Create photo record in Airtable
        const airtableData = {
            fields: {
                'Project': [projectId],
                'Photo Type': photoType,
                'Uploaded By': 'Homeowner',
                'Photos': [{ url: imageUrl }]
            }
        };

        console.log('📤 Creating Airtable record...');
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
            console.error('❌ Airtable error:', errorData);
            return res.status(500).json({ 
                error: 'Failed to create Airtable record',
                details: errorData
            });
        }

        const result = await airtableResponse.json();
        console.log('✅ Photo record created! ID:', result.id);
        console.log('=== Upload Complete ===');

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
