export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const projectRecordId = req.query.projectId;
    
    if (!projectRecordId) {
        return res.status(400).json({ error: 'projectId parameter required' });
    }
    
    const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
    const BASE_ID = 'applWK4PXoo86ajvD';
    
    if (!AIRTABLE_TOKEN) {
        return res.status(500).json({ error: 'AIRTABLE_TOKEN not configured' });
    }
    
    try {
        console.log('Fetching project record:', projectRecordId);
        
        // Fetch the project to get the Project ID number
        const projectUrl = `https://api.airtable.com/v0/${BASE_ID}/Projects/${projectRecordId}`;
        
        const projectResponse = await fetch(projectUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!projectResponse.ok) {
            const errorText = await projectResponse.text();
            console.error('Project fetch failed:', errorText);
            throw new Error(`Failed to fetch project: ${projectResponse.status}`);
        }
        
        const projectData = await projectResponse.json();
        const projectIdNumber = projectData.fields['Project ID'];
        
        console.log('Project ID number:', projectIdNumber);
        
        if (!projectIdNumber && projectIdNumber !== 0) {
            console.log('No Project ID found');
            return res.status(200).json({ records: [] });
        }
        
        // Query Photos table by Project ID number
        const filterFormula = `{Project ID} = ${projectIdNumber}`;
        const encodedFormula = encodeURIComponent(filterFormula);
        const photosUrl = `https://api.airtable.com/v0/${BASE_ID}/Photos?filterByFormula=${encodedFormula}`;
        
        console.log('Querying photos with formula:', filterFormula);
        
        const photosResponse = await fetch(photosUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!photosResponse.ok) {
            const errorText = await photosResponse.text();
            console.error('Photos fetch failed:', errorText);
            throw new Error(`Failed to fetch photos: ${photosResponse.status}`);
        }
        
        const photosData = await photosResponse.json();
        
        console.log('Photos found:', photosData.records.length);
        
        return res.status(200).json(photosData);
        
    } catch (error) {
        console.error('Error in get-photos:', error.message);
        console.error('Stack:', error.stack);
        return res.status(500).json({ 
            error: 'Failed to load photos',
            message: error.message 
        });
    }
}
```

---

## 🔑 **Key Changes:**

1. **Template literals** for all URL building (no string concatenation)
2. **Explicit variable declarations** before using them
3. **Better error logging** with stack traces
4. **Proper encoding** of the formula
5. **Return statements** for early exits

---

## 📝 **Deploy Steps:**

1. Go to GitHub: `bolt-quotes-proxy/api/get-photos.js`
2. Click **Edit**
3. **Delete everything** (Ctrl+A, Delete)
4. **Copy this entire code** (use the copy button)
5. **Paste** into the empty file
6. **Commit**: "Fix syntax error with template literals"
7. Wait 2 minutes for deployment
8. Test again

---

## ✅ **Expected Vercel Logs:**
```
Fetching project record: recsd0x6NHRu6yuFR
Project ID number: 8
Querying photos with formula: {Project ID} = 8
Photos found: 4
