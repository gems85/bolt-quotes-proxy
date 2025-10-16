const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
const BASE_ID = applWK4PXoo86ajvD;
const QUOTES_TABLE = 'Quotes';

export default async function handler(req, res) {
    // Set CORS headers
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

    const { projectId } = req.body;

    if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
    }

    console.log('🔍 Getting or creating quote for project:', projectId);

    try {
        // Step 1: Check if a quote already exists for this project
        console.log('🔍 Checking for existing quote for project:', projectId);
        
        const searchUrl = `https://api.airtable.com/v0/${BASE_ID}/Quotes?filterByFormula=SEARCH("${projectId}", ARRAYJOIN({Projects}))`;
        
        const searchResponse = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            console.error('❌ Error searching for quote:', errorText);
            throw new Error(`Airtable search failed: ${errorText}`);
        }

        const searchData = await searchResponse.json();
        
        // If quote exists, return it
        if (searchData.records && searchData.records.length > 0) {
            const existingQuote = searchData.records[0];
            console.log('📋 Found existing quote:', existingQuote.fields['Quote ID']);
            console.log('♻️ Loaded existing quote - no duplicate created');
            console.log('💾 Quote record ID:', existingQuote.id);
            
            return res.status(200).json({
                success: true,
                quoteId: existingQuote.fields['Quote ID'],
                recordId: existingQuote.id,
                isNew: false,
                quote: existingQuote.fields
            });
        }

        // Step 2: No existing quote found, create a new one
        console.log('📝 No existing quote found, creating new quote...');
        
        const createUrl = `https://api.airtable.com/v0/${BASE_ID}/Quotes`;
        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    'Projects': [projectId],
                    'Status': 'Quote Draft'  // Set status to Quote Draft when quote is created
                }
            })
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('❌ Error creating quote:', errorText);
            throw new Error(`Failed to create quote: ${errorText}`);
        }

        const newQuote = await createResponse.json();
        
        // Step 3: Update the project status to "Quote Draft"
        console.log('📝 Updating project status to "Quote Draft"...');
        
        const updateProjectUrl = `https://api.airtable.com/v0/${BASE_ID}/Projects/${projectId}`;
        const updateProjectResponse = await fetch(updateProjectUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    'Status': 'Quote Draft'
                }
            })
        });

        if (!updateProjectResponse.ok) {
            console.error('⚠️ Warning: Could not update project status');
        } else {
            console.log('✅ Project status updated to "Quote Draft"');
        }

        console.log('✅ Created new quote:', newQuote.fields['Quote ID']);
        console.log('🎉 Airtable auto-generated the Quote ID');
        console.log('📋 Quote record ID:', newQuote.id);

        return res.status(200).json({
            success: true,
            quoteId: newQuote.fields['Quote ID'],
            recordId: newQuote.id,
            isNew: true,
            quote: newQuote.fields
        });

    } catch (error) {
        console.error('❌ Error in get-or-create-quote:', error);
        return res.status(500).json({ 
            error: 'Failed to get or create quote',
            details: error.message 
        });
    }
}
