export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { photoData, projectId, photoType, uploadedBy } = req.body;
        
        if (!photoData || !projectId || !photoType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
        const BASE_ID = 'applWK4PXoo86ajvD';
        
        // Extract base64 data
        const base64Data = photoData.split(',')[1];
        const mimeType = photoData.split(';')[0].split(':')[1];
        const extension = mimeType.split('/')[1];
        const filename = `${photoType.replace(/\s+/g, '-')}-${Date.now()}.${extension}`;
        
        // Calculate file size in MB
        const fileSizeBytes = Math.ceil((base64Data.length * 3) / 4);
        const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
        
        // Generate Photo ID
        const photoId = `PHOTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create photo record with attachment
        const photoRecord = {
            fields: {
                'Photo ID': photoId,
                'Project': [projectId],
                'Photo Type': photoType,
                'Uploaded By': uploadedBy || 'Homeowner',
                'File': [{
                    url: photoData  // Airtable will convert this
                }],
                'File Size (MB)': parseFloat(fileSizeMB),
                'Uploaded At': new Date().toISOString()
            }
        };
        
        const response = await fetch(
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
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to create photo record');
        }
        
        const result = await response.json();
        res.status(200).json({ success: true, record: result });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'Upload failed', 
            message: error.message 
        });
    }
}
