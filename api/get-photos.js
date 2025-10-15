export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    var projectRecordId = req.query.projectId;
    
    if (!projectRecordId) {
        res.status(400).json({ error: 'projectId required' });
        return;
    }
    
    var AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    var BASE_ID = 'applWK4PXoo86ajvD';
    
    if (!AIRTABLE_TOKEN) {
        res.status(500).json({ error: 'Token not configured' });
        return;
    }
    
    try {
        console.log('Fetching project:', projectRecordId);
        
        var projectUrl = 'https://api.airtable.com/v0/' + BASE_ID + '/Projects/' + projectRecordId;
        
        var projectResponse = await fetch(projectUrl, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + AIRTABLE_TOKEN,
                'Content-Type': 'application/json'
            }
        });
        
        if (!projectResponse.ok) {
            throw new Error('Failed to fetch project');
        }
        
        var projectData = await projectResponse.json();
        var projectIdNumber = projectData.fields['Project ID'];
        
        console.log('Project ID number:', projectIdNumber);
        
        if (!projectIdNumber && projectIdNumber !== 0) {
            res.status(200).json({ records: [] });
            return;
        }
        
        var filterFormula = '{Project ID} = ' + projectIdNumber;
        var encodedFormula = encodeURIComponent(filterFormula);
        var photosUrl = 'https://api.airtable.com/v0/' + BASE_ID + '/Photos?filterByFormula=' + encodedFormula;
        
        console.log('Querying photos');
        
        var photosResponse = await fetch(photosUrl, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + AIRTABLE_TOKEN,
                'Content-Type': 'application/json'
            }
        });
        
        if (!photosResponse.ok) {
            throw new Error('Failed to fetch photos');
        }
        
        var photosData = await photosResponse.json();
        
        console.log('Photos found:', photosData.records.length);
        
        res.status(200).json(photosData);
        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to load photos',
            message: error.message 
        });
    }
}
