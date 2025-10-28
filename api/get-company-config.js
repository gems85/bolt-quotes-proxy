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
        const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_PAT;
        const BASE_ID = process.env.BASE_ID;
        const COMPANY_CONFIG_TABLE = process.env.COMPANY_CONFIG_TABLE || 'COMPANY_CONFIG';
        
        if (!AIRTABLE_TOKEN || !BASE_ID) {
            throw new Error('Missing Airtable credentials');
        }
        
        // Fetch the first record from COMPANY_CONFIG table
        const response = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/${COMPANY_CONFIG_TABLE}?maxRecords=1`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`
                }
            }
        );
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to load company config');
        }
        
        const data = await response.json();
        
        if (!data.records || data.records.length === 0) {
            // Return default config if no record exists
            return res.status(200).json({
                success: true,
                data: {
                    companyName: 'EV Charger Installation',
                    logo: '',
                    address: '',
                    phone: '',
                    email: '',
                    licenseNumber: '',
                    website: ''
                }
            });
        }
        
        const config = data.records[0].fields;
        
        res.status(200).json({
            success: true,
            data: {
                companyName: config['Company Name'] || 'EV Charger Installation',
                logo: config['Logo']?.[0]?.url || '',
                address: config['Address'] || '',
                phone: config['Phone'] || '',
                email: config['Email'] || '',
                licenseNumber: config['License Number'] || '',
                website: config['Website'] || ''
            }
        });
        
    } catch (error) {
        console.error('Error loading company config:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to load company config', 
            message: error.message 
        });
    }
}
