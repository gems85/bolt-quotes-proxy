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
    
    const projectRecordId = req.query.projectId;
    
    if (!projectRecordId) {
        return res.status(400).json({ error: 'Project ID required' });
    }
    
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const BASE_ID = 'applWK4PXoo86ajvD';
    
    if (!AIRTABLE_TOKEN) {
        return res.status(500).json({ error: 'Token not configured' });
    }
    
    try {
        console.log('Step 1: Fetching project record:', projectRecordId);
        
        // Get the project to find the Project ID number
        const projectRes = await fetch(
            'https://api.airtable.com/v0/' + BASE_ID + '/Projects/' + projectRecordId,
            {
                headers: {
                    'Authorization': 'Bearer ' + AIRTABLE_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!projectRes.ok) {
            throw new Error('Project not found: ' + projectRes.status);
        }
        
        const project = await projectRes.json();
        const projectIdNumber = project.fields['Project ID'];
        
        console.log('Step 2: Project ID number:', projectIdNumber);
        
        if (!projectIdNumber) {
            return res.status(200).json({ records: [] });
        }
        
        // Query Photos table by Project ID number
        const formula = '{Project ID} = ' + projectIdNumber;
        
        console.log('Step 3: Querying photos with formula:', formula);
        
        const photosRes = await fetch(
            'https://api.airtable.com/v0/' + BASE_ID + '/Photos?filterByFormula=' + encodeURIComponent(formula),
            {
                headers: {
                    'Authorization': 'Bearer ' + AIRTABLE_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!photosRes.ok) {
            const errorText = await photosRes.text();
            console.error('Photos query failed:', errorText);
            throw new Error('Failed to fetch photos: ' + photosRes.status);
        }
        
        const data = await photosRes.json();
        
        console.log('Step 4: Photos found:', data.records.length);
        
        return res.status(200).json(data);
        
    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({ 
            error: 'Failed to load photos',
            message: error.message 
        });
    }
}
```

---

## 🎯 **What This Does:**

1. Gets the project record by Airtable ID (e.g., `recsd0x6NHRu6yuFR`)
2. Extracts the "Project ID" number field (e.g., `8`)
3. Queries the Photos table where `{Project ID} = 8`
4. Returns all matching photos

---

## 🚀 **Deploy and Test:**

1. Update `/api/get-photos.js` in GitHub
2. Commit changes
3. Wait 2 minutes for Vercel deployment
4. Test the quote generator

**Expected Vercel logs:**
```
Step 1: Fetching project record: recsd0x6NHRu6yuFR
Step 2: Project ID number: 8
Step 3: Querying photos with formula: {Project ID} = 8
Step 4: Photos found: 4
