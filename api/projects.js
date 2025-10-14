// api/projects.js
// Vercel Serverless Function to fetch projects from Airtable

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
    const BASE_ID = 'applWK4PXoo86ajvD';
    const TABLE_NAME = 'Projects';

    if (!AIRTABLE_TOKEN) {
        return res.status(500).json({ error: 'Airtable API token not configured' });
    }

    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?view=Grid%20view`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Airtable API Error:', errorData);
            return res.status(response.status).json({ 
                error: 'Failed to fetch projects from Airtable',
                details: errorData
            });
        }

        const data = await response.json();
        
        // Return the projects
        return res.status(200).json({
            success: true,
            projects: data.records || []
        });

    } catch (error) {
        console.error('Error fetching projects:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
