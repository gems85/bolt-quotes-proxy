// api/upload-photo.js
// Uses ImgBB for image hosting

export default async function handler(req, res) {
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
        // Parse request body (Vercel doesn't auto-parse JSON)
        let body;
        if (typeof req.body === 'string') {
            body = JSON.parse(req.body);
        } else if (req.body && typeof req.body === 'object') {
            body = req.body;
        } else {
            // Read raw body
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            const rawBody = Buffer.concat(chunks).toString('utf8');
            body = JSON.parse(rawBody);
        }

        const { projectId, photoType, imageBase64 } = body;

        if (!projectId || !photoType || !imageBase64) {
            console.error('Missing fields:', { projectId: !!projectId, photoType: !!photoType, imageBase64: !!imageBase64 });
            return res.status(400).json({ error: 'Missing required fields' });
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

        if (!imgbbResponse.ok) {
            const errorText = await imgbbResponse.text();
            console.error('ImgBB error:', errorText);
            throw new Error('Failed to upload image to ImgBB');
        }

        const imgbbData = await imgbbResponse.json();
        
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
            throw new Error('Failed to create photo record in Airtable');
        }

        const result = await airtableResponse.json();
        console.log('Photo record created:', result.id);

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
            stack: error.stack
        });
    }
}
