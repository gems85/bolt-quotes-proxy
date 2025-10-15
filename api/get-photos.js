export default async function handler(req, res) {
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
        
        console.log('Fetching project first to get photo IDs...');
        
        // Step 1: Get the project to retrieve photo IDs
        const projectResponse = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/Projects/${projectId}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!projectResponse.ok) {
            throw new Error(`Failed to fetch project: ${projectResponse.status}`);
        }
        
        const projectData = await projectResponse.json();
        const photoIds = projectData.fields.Photos || [];
        
        console.log('Photo IDs from project:', photoIds);
        
        if (photoIds.length === 0) {
            return res.status(200).json({ records: [] });
        }
        
        // Step 2: Fetch each photo by ID
        const photoPromises = photoIds.map(photoId =>
            fetch(
                `https://api.airtable.com/v0/${BASE_ID}/Photos/${photoId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            ).then(res => res.json())
        );
        
        const photos = await Promise.all(photoPromises);
        
        console.log('Photos fetched:', photos.length);
        
        res.status(200).json({ records: photos });
        
    } catch (error) {
        console.error('Error loading photos:', error);
        res.status(500).json({ 
            error: 'Failed to load photos', 
            message: error.message 
        });
    }
}
```

**What this does differently:**
1. Fetches the project record first
2. Gets the photo IDs from the project's `Photos` field
3. Fetches each photo individually by ID
4. Returns all photos

This bypasses the formula query issue entirely.

---

## 🚀 **Deploy and Test:**

1. Replace `/api/get-photos.js` in GitHub with the code above
2. Wait for Vercel deployment (1-2 min)
3. Test the quote generator again
4. Check the Vercel logs - you should see:
```
   Photo IDs from project: [...]
   Photos fetched: 4
