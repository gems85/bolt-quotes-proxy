// api/get-photos.js
// Fetches photos for a specific project

const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
const BASE_ID = process.env.BASE_ID;
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

        console.log('Fetching project to get Project ID number:', projectId);

        // First, get the project to extract its numeric Project ID
        const projectUrl = `https://api.airtable.com/v0/${BASE_ID}/Projects/${projectId}`;
        
        const projectResponse = await fetch(projectUrl, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!projectResponse.ok) {
            console.error('Error fetching project:', projectResponse.status);
            throw new Error(`Failed to fetch project: ${projectResponse.status}`);
        }

        const projectData = await projectResponse.json();
        const projectIdWithPrefix = projectData.fields['Project ID'];
        
        console.log('Project ID with prefix:', projectIdWithPrefix);

        if (!projectIdWithPrefix) {
            console.log('No Project ID found, returning empty results');
            return res.status(200).json({ records: [] });
        }

        // Now filter photos by the Project ID with prefix (e.g., "PRJ-8")
        const filterFormula = `{Project ID} = "${projectIdWithPrefix}"`;
        const photosUrl = `https://api.airtable.com/v0/${BASE_ID}/${PHOTOS_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}`;

        console.log('Fetching photos with filter:', filterFormula);

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
