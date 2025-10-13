export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { photoData, projectId, photoType, uploadedBy, width, height } = req.body;
        
        if (!photoData || !projectId || !photoType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
        const BASE_ID = 'applWK4PXoo86ajvD';
        
        // Calculate file size
        const base64Data = photoData.split(',')[1];
        const fileSizeBytes = Math.ceil((base64Data.length * 3) / 4);
        const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
        
        // Generate Photo ID
        const photoId = `PHOTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Get file extension from data URL
        const mimeType = photoData.split(';')[0].split(':')[1];
        const extension = mimeType.split('/')[1];
        const filename = `${photoType.replace(/\s+/g, '-')}-${Date.now()}.${extension}`;
        
        // Create photo record
        const photoRecord = {
            fields: {
                'Photo ID': photoId,
                'Project': [projectId],
                'Photo Type': photoType,
                'Uploaded By': uploadedBy || 'Homeowner',
                'File Size (MB)': parseFloat(fileSizeMB),
                'Width': width || null,
                'Uploaded At': new Date().toISOString()
            }
        };
        
        // First create the record
        const createResponse = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/Photos`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(photoRecord)
            }
        );
        
        if (!createResponse.ok) {
            const error = await createResponse.json();
            throw new Error(error.error?.message || 'Failed to create photo record');
        }
        
        const createdRecord = await createResponse.json();
        
        // Now upload the file attachment
        const attachmentResponse = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/Photos/${createdRecord.id}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        'File': [{
                            filename: filename,
                            url: photoData
                        }]
                    }
                })
            }
        );
        
        if (!attachmentResponse.ok) {
            const error = await attachmentResponse.json();
            console.error('Attachment error:', error);
            // Don't fail - record was created, just missing attachment
        }
        
        res.status(200).json({ success: true, record: createdRecord });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'Upload failed', 
            message: error.message 
        });
    }
}
