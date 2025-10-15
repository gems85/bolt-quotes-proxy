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
    
    const projectId = req.query.projectId;
    
    if (!projectId) {
        return res.status(400).json({ error: 'Project ID required' });
    }
    
    const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
    const BASE_ID = 'applWK4PXoo86ajvD';
    
    if (!AIRTABLE_TOKEN) {
        return res.status(500).json({ error: 'Token not configured' });
    }
    
    try {
        console.log('Fetching project:', projectId);
        
        const projectRes = await fetch(
            'https://api.airtable.com/v0/' + BASE_ID + '/Projects/' + projectId,
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
        const photoIds = project.fields.Photos || [];
        
        console.log('Photo IDs:', photoIds.length);
        
        if (photoIds.length === 0) {
            return res.status(200).json({ records: [] });
        }
        
        const photos = [];
        
        for (const photoId of photoIds) {
            const photoRes = await fetch(
                'https://api.airtable.com/v0/' + BASE_ID + '/Photos/' + photoId,
                {
                    headers: {
                        'Authorization': 'Bearer ' + AIRTABLE_TOKEN,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (photoRes.ok) {
                const photo = await photoRes.json();
                photos.push(photo);
            }
        }
        
        console.log('Fetched photos:', photos.length);
        
        return res.status(200).json({ records: photos });
        
    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({ 
            error: 'Failed to load photos',
            message: error.message 
        });
    }
}
```

**Key differences in this version:**
- Uses string concatenation instead of template literals (avoids encoding issues)
- Simpler destructuring
- Uses a `for` loop instead of `Promise.all()` (easier to debug)
- More explicit error handling

---

## 📝 **Update Steps:**

1. Go to GitHub: `bolt-quotes-proxy/api/get-photos.js`
2. Click **Edit** (pencil icon)
3. **Select ALL** (Ctrl+A or Cmd+A)
4. **Delete**
5. **Copy the code above** - make sure you get it all
6. **Paste** into the empty file
7. **Commit changes**: "Fix syntax error in get-photos"
8. Wait 2 minutes for Vercel deployment
9. Test again

---

## 🎯 **Expected Result:**

After deployment, Vercel logs should show:
```
Fetching project: recsd0x6NHRu6yuFR
Photo IDs: 4
Fetched photos: 4
```

**NOT:**
```
SyntaxError: Unexpected identifier 'Photos'
