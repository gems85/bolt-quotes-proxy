// /api/get-or-create-quote.js
// Vercel Serverless Function to get or create a quote for a project

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { projectId } = req.query;

    if (!projectId) {
        return res.status(400).json({ 
            success: false, 
            error: 'Project ID is required' 
        });
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
    const BASE_ID = process.env.BASE_ID;
    const QUOTES_TABLE = 'tbl7stAGnVLMkAHNy';

    try {
        // Check if a quote already exists for this project
        const filterFormula = `FIND('${projectId}', ARRAYJOIN({Project}))`;
        const searchUrl = `https://api.airtable.com/v0/${BASE_ID}/${QUOTES_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}`;
        
        const searchResponse = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`
            }
        });

        const searchData = await searchResponse.json();

        // If quote already exists, return it
        if (searchData.records && searchData.records.length > 0) {
            const existingQuote = searchData.records[0];
            console.log('Found existing quote:', existingQuote.fields['Quote ID']);
            
            return res.status(200).json({
                success: true,
                quoteId: existingQuote.fields['Quote ID'],
                quoteRecordId: existingQuote.id,
                created: false,
                message: 'Quote already exists'
            });
        }

        // If no quote exists, create a new one
        console.log('No quote found, creating new quote for project:', projectId);
        
        const createUrl = `https://api.airtable.com/v0/${BASE_ID}/${QUOTES_TABLE}`;
        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    'Project': [projectId]
                }
            })
        });

        const createData = await createResponse.json();

        if (createResponse.ok) {
            console.log('Created new quote:', createData.fields['Quote ID']);
            
            return res.status(200).json({
                success: true,
                quoteId: createData.fields['Quote ID'],
                quoteRecordId: createData.id,
                created: true,
                message: 'New quote created'
            });
        } else {
            console.error('Failed to create quote:', createData);
            return res.status(500).json({
                success: false,
                error: 'Failed to create quote',
                details: createData
            });
        }

    } catch (error) {
        console.error('Error in get-or-create-quote:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
