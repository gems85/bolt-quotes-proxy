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
        const { projectId, status } = req.body;
        
        if (!projectId || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
        const BASE_ID = 'applWK4PXoo86ajvD';
        
        const response = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/Projects/${projectId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        'Status': status
                    }
                })
            }
        );
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to update status');
        }
        
        const result = await response.json();
        res.status(200).json({ success: true, record: result });
        
    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ 
            error: 'Update failed', 
            message: error.message 
        });
    }
}
