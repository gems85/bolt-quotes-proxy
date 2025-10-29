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
        const { projectId } = req.body;
        
        if (!projectId) {
            return res.status(400).json({ 
                success: false,
                error: 'Project ID is required' 
            });
        }
        
        const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_PAT;
        const BASE_ID = process.env.BASE_ID;
        const QUOTES_TABLE = process.env.QUOTES_TABLE || 'QUOTES';
        
        if (!AIRTABLE_TOKEN || !BASE_ID) {
            throw new Error('Missing Airtable credentials');
        }
        
        // Search for existing quotes for this project
        const filterFormula = `{Project ID} = '${projectId}'`;
        const searchResponse = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/${QUOTES_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}&sort%5B0%5D%5Bfield%5D=Version&sort%5B0%5D%5Bdirection%5D=desc`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`
                }
            }
        );
        
        if (!searchResponse.ok) {
            throw new Error('Failed to search for existing quotes');
        }
        
        const searchData = await searchResponse.json();
        
        // If quotes exist, get the latest version and increment
        if (searchData.records && searchData.records.length > 0) {
            const latestQuote = searchData.records[0].fields;
            const existingQuoteId = latestQuote['Quote ID'];
            const currentVersion = latestQuote['Version'] || 1;
            const nextVersion = currentVersion + 1;
            
            return res.status(200).json({
                success: true,
                data: {
                    quoteId: existingQuoteId,
                    version: nextVersion,
                    isNewQuote: false,
                    previousVersion: currentVersion
                }
            });
        }
        
        // No existing quotes - generate new Quote ID
        const newQuoteId = 'QUO-' + Math.floor(Math.random() * 10000);
        
        res.status(200).json({
            success: true,
            data: {
                quoteId: newQuoteId,
                version: 1,
                isNewQuote: true
            }
        });
        
    } catch (error) {
        console.error('Error getting quote version:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get quote version', 
            message: error.message 
        });
    }
}
