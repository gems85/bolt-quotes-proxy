// api/get-photos.js
// Fetches photos for a specific project

const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
const BASE_ID = 'applWK4PXoo86ajvD';
const PHOTOS_TABLE = 'Photos';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!AIRTABLE_TOKEN) {
        console.error('AIRTABLE_PAT not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const { projectId } = req.query;

        if (!projectId) {
            return res.status(400).json({ error: 'Project ID is required' });
        }

        console.log('Fetching photos for project:', projectId);

        // Use SEARCH to find photos where the Project field contains this project ID
        const filterFormula = `SEARCH("${projectId}", ARRAYJOIN({Project}))`;
        const photosUrl = `https://api.airtable.com/v0/${BASE_ID}/${PHOTOS_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}`;

        const response = await fetch(photosUrl, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error fetching photos from Airtable:', errorData);
            throw new Error(`Airtable API error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Found ${data.records ? data.records.length : 0} photos`);

        return res.status(200).json(data);

    } catch (error) {
        console.error('Error in get-photos:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch photos',
            message: error.message 
        });
    }
}
