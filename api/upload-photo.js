// api/upload-photo.js
// Uses ImgBB for image hosting

// Disable automatic body parsing - we'll do it manually
export const config = {
    api: {
        bodyParser: false,
    },
};

// Get environment variables at module level
const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const BASE_ID = 'applWK4PXoo86ajvD';
const PHOTOS_TABLE = 'Photos';

// Helper to read request body
async function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let totalLength = 0;
        
        req.on('data', chunk => {
            chunks.push(chunk);
            totalLength += chunk.length;
            console.log('Received chunk, size:', chunk.length, 'Total so far:', totalLength);
        });
        
        req.on('end', () => {
            try {
                const buffer = Buffer.concat(chunks);
                const bodyString = buffer.toString('utf8');
                
                console.log('Body complete. Total size:', totalLength);
                console.log('Body start (first 100 chars):', bodyString.substring(0, 100));
                console.log('Body end (last 100 chars):', bodyString.substring(bodyString.length - 100));
                
                const parsed = JSON.parse(bodyString);
                resolve(parsed);
            } catch (e) {
                console.error('JSON parse error:', e.message);
                console.error('Failed to parse body');
                reject(e);
            }
        });
        
        req.on('error', (err) => {
            console.error('Request stream error:', err);
            reject(err);
        });
    });
}

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

    console.log('=== Upload Photo API Called ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Content-Length:', req.headers['content-length']);

    if (!AIRTABLE_PAT || !IMGBB_API_KEY) {
        console.error('Missing environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        console.log('Reading request body...');
        const body = await readBody(req);
        
        console.log('✅ Body parsed successfully');
        console.log('Body keys:', Object.keys(body));

        const { projectId, photoType, imageBase64 } = body;

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
                    'Authorization': `Bearer ${AIRTABLE_PAT}`,
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
        console.error('Error name:', error.name);
        if (error.stack) {
            console.error('Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
        }
        return res.status(500).json({
            error: 'Failed to upload photo',
            message: error.message,
            type: error.name
        });
    }
}
