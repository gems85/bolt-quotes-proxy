export default async function handler(req, res) {
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
        const { pdfData, quoteId, projectId } = req.body;
        
        if (!pdfData || !quoteId) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing PDF data or quote ID' 
            });
        }
        
        const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
        const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_PAT;
        const BASE_ID = process.env.BASE_ID;
        const QUOTES_TABLE = process.env.QUOTES_TABLE || 'QUOTES';
        
        if (!IMGBB_API_KEY) {
            throw new Error('IMGBB_API_KEY not configured');
        }
        
        // Remove data URL prefix if present
        const base64Data = pdfData.replace(/^data:application\/pdf;base64,/, '');
        
        // Upload to IMGBB
        const formData = new URLSearchParams();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64Data);
        formData.append('name', `quote-${quoteId}`);
        
        const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!imgbbResponse.ok) {
            const error = await imgbbResponse.json();
            throw new Error(`IMGBB upload failed: ${error.error?.message || 'Unknown error'}`);
        }
        
        const imgbbData = await imgbbResponse.json();
        
        if (!imgbbData.success || !imgbbData.data?.url) {
            throw new Error('IMGBB upload failed: No URL returned');
        }
        
        const pdfUrl = imgbbData.data.url;
        
        // Find the quote record in Airtable by Quote ID
        const filterFormula = `{Quote ID} = '${quoteId}'`;
        const searchResponse = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/${QUOTES_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`
                }
            }
        );
        
        if (!searchResponse.ok) {
            throw new Error('Failed to find quote record');
        }
        
        const searchData = await searchResponse.json();
        
        if (!searchData.records || searchData.records.length === 0) {
            throw new Error(`Quote ${quoteId} not found in Airtable`);
        }
        
        const recordId = searchData.records[0].id;
        
        // Update the quote record with PDF URL
        const updateResponse = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/${QUOTES_TABLE}/${recordId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        'Quote Document': [{ url: pdfUrl }],
                        'PDF URL': pdfUrl
                    }
                })
            }
        );
        
        if (!updateResponse.ok) {
            const error = await updateResponse.json();
            throw new Error(`Failed to update Airtable: ${error.error?.message || 'Unknown error'}`);
        }
        
        res.status(200).json({
            success: true,
            pdfUrl: pdfUrl,
            message: 'PDF uploaded successfully'
        });
        
    } catch (error) {
        console.error('Error uploading PDF:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to upload PDF', 
            message: error.message 
        });
    }
}
