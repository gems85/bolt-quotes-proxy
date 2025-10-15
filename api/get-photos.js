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
        
        console.log('Fetching project to get photo IDs');
        
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
        
        console.log('Photo IDs:', photoIds);
        
        if (photoIds.length === 0) {
            return res.status(200).json({ records: [] });
        }
        
        const photoPromises = photoIds.map(photoId =>
            fetch(
                `https://api.airtable.com/v0/${BASE_ID}/Photos/${photoId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            ).then(response => response.json())
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

---

## 📝 **Steps to Update:**

1. Go to GitHub: `bolt-quotes-proxy/api/get-photos.js`
2. Click **pencil icon** to edit
3. **Select ALL** (Ctrl+A)
4. **Delete everything**
5. **Copy the code above** (use the copy button in the code block)
6. **Paste** into the empty file
7. **Scroll through** to make sure it looks correct - no weird characters
8. **Commit changes**
9. Wait for Vercel deployment (1-2 min)
10. Test again

---

## ✅ **Verification:**

After deployment, the Vercel logs should show:
```
Fetching project to get photo IDs
Photo IDs: [...]
Photos fetched: 4
```

**NOT:**
```
SyntaxError: Unexpected identifier
