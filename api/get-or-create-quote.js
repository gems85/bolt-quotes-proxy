// api/get-or-create-quote.js
// Gets existing quote for a project or creates a new one

const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
const BASE_ID = 'applWK4PXoo86ajvD';
const QUOTES_TABLE = 'Quotes';

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

    if (!AIRTABLE_TOKEN) {
        console.error('AIRTABLE_PAT not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const { projectId } = req.body;

        if (!projectId) {
            return res.status(400).json({ error: 'Project ID is required' });
        }

        console.log('Getting or creating quote for project:', projectId);

        // First, check if a quote already exists for this project
        // Use SEARCH function to look for the project ID in the linked record field
        const filterFormula = `SEARCH("${projectId}", ARRAYJOIN({Project}))`;
        const searchUrl = `https://api.airtable.com/v0/${BASE_ID}/${QUOTES_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}`;
        
        const searchResponse = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!searchResponse.ok) {
            const errorData = await searchResponse.json();
            console.error('Error searching for quote:', errorData);
            throw new Error('Failed to search for existing quote');
        }

        const searchData = await searchResponse.json();

        // If quote exists, return it
        if (searchData.records && searchData.records.length > 0) {
            const existingQuote = searchData.records[0];
            console.log('Found existing quote:', existingQuote.fields['Quote ID']);
            
            return res.status(200).json({
                success: true,
                quote: existingQuote,
                created: false
            });
        }

        // If no quote exists, create one
        console.log('No existing quote found. Creating new quote...');

        const createUrl = `https://api.airtable.com/v0/${BASE_ID}/${QUOTES_TABLE}`;
        
        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                records: [
                    {
                        fields: {
                            'Project': [projectId]
                        }
                    }
                ]
            })
        });

        if (!createResponse.ok) {
            const errorData = await createResponse.json();
            console.error('Error creating quote:', errorData);
            throw new Error('Failed to create quote record');
        }

        const createData = await createResponse.json();
        const newQuote = createData.records[0];
        
        console.log('✅ Created new quote:', newQuote.fields['Quote ID']);

        return res.status(200).json({
            success: true,
            quote: newQuote,
            created: true
        });

    } catch (error) {
        console.error('Error in get-or-create-quote:', error);
        return res.status(500).json({ 
            error: 'Failed to get or create quote',
            message: error.message 
        });
    }
}
