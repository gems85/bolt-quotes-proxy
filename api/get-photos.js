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
        const { projectId } = req.query;
        
        if (!projectId) {
            return res.status(400).json({ error: 'Project ID is required' });
        }
        
        const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
        const BASE_ID = 'applWK4PXoo86ajvD';
        
        if (!AIRTABLE_TOKEN) {
            throw new Error('AIRTABLE_TOKEN not configured');
        }
        
        // Use SEARCH formula to find photos linked to this project
        const formula = `SEARCH("${projectId}", {Project})`;
        
        const response = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/Photos?filterByFormula=${encodeURIComponent(formula)}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Airtable error:', errorText);
            throw new Error(`Airtable API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        res.status(200).json(data);
        
    } catch (error) {
        console.error('Error loading photos:', error);
        res.status(500).json({ 
            error: 'Failed to load photos', 
            message: error.message 
        });
    }
}
