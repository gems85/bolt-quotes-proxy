export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
        const BASE_ID = 'applWK4PXoo86ajvD';
        
        const response = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/Projects?sort%5B0%5D%5Bfield%5D=Created%20At&sort%5B0%5D%5Bdirection%5D=desc`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`
                }
            }
        );
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to load projects');
        }
        
        const data = await response.json();
        res.status(200).json(data);
        
    } catch (error) {
        console.error('Error loading projects:', error);
        res.status(500).json({ 
            error: 'Failed to load projects', 
            message: error.message 
        });
    }
}
