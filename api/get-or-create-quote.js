// api/get-or-create-quote.js
// Gets existing quote for a project or creates a new one
// Prevents duplicates and ensures Quote ID auto-generation

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
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

    if (!AIRTABLE_PAT) {
        console.error('AIRTABLE_PAT not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const { projectId } = req.body;

        if (!projectId) {
            return res.status(400).json({ error: 'Project ID is required' });
        }

        console.log('🔍 Checking for existing quote for project:', projectId);

        // STEP 1: Check if a quote already exists for this project
        // Use SEARCH function to look for the project ID in the linked "Projects" field
        const filterFormula = `SEARCH("${projectId}", ARRAYJOIN({Projects}))`;
        const searchUrl = `https://api.airtable.com/v0/${BASE_ID}/${QUOTES_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}`;
        
        const searchResponse = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            }
        });

        if (!searchResponse.ok) {
            const errorData = await searchResponse.json();
            console.error('❌ Error searching for quote:', errorData);
            throw new Error('Failed to search for existing quote');
        }

        const searchData = await searchResponse.json();

        // STEP 2: If quote exists, return it (no duplicate creation)
        if (searchData.records && searchData.records.length > 0) {
            const existingQuote = searchData.records[0];
            const quoteId = existingQuote.fields['Quote ID'];
            
            console.log('✅ Found existing quote:', quoteId);
            console.log('📋 Quote record ID:', existingQuote.id);
            
            return res.status(200).json({
                success: true,
                quote: existingQuote,
                created: false,
                message: `Loaded existing quote: ${quoteId}`
            });
        }

        // STEP 3: No quote exists, create a new one
        console.log('📝 No existing quote found. Creating new quote...');

        const createUrl = `https://api.airtable.com/v0/${BASE_ID}/${QUOTES_TABLE}`;
        
        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                records: [
                    {
                        fields: {
                            'Projects': [projectId]
                        }
                    }
                ]
            })
        });

        if (!createResponse.ok) {
            const errorData = await createResponse.json();
            console.error('❌ Error creating quote:', errorData);
            throw new Error('Failed to create quote record');
        }

        const createData = await createResponse.json();
        const newQuote = createData.records[0];
        const newQuoteId = newQuote.fields['Quote ID'];
        
        console.log('✅ Created new quote:', newQuoteId);
        console.log('📋 Quote record ID:', newQuote.id);
        console.log('🎉 Airtable auto-generated Quote ID successfully');

        return res.status(200).json({
            success: true,
            quote: newQuote,
            created: true,
            message: `Created new quote: ${newQuoteId}`
        });

    } catch (error) {
        console.error('❌ Error in get-or-create-quote:', error);
        return res.status(500).json({ 
            error: 'Failed to get or create quote',
            message: error.message 
        });
    }
}
