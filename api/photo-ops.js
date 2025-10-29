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
        
        const response = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/${COMPANY_CONFIG_TABLE}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch company config from Airtable');
        }
        
        const data = await response.json();
        
        if (!data.records || data.records.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'No company configuration found' 
            });
        }
        
        const config = data.records[0].fields;
        
        // Parse JSON fields
        const parsedConfig = {
            ...config,
            optionalAddons: config['Optional Addons'] ? JSON.parse(config['Optional Addons']) : [],
            rebates: config['Rebates'] ? JSON.parse(config['Rebates']) : [],
            financingPlans: config['Financing Plans'] ? JSON.parse(config['Financing Plans']) : [],
            whatsIncluded: config['Whats Included'] ? JSON.parse(config['Whats Included']) : [],
            stateTaxRates: config['State Tax Rates'] ? JSON.parse(config['State Tax Rates']) : {}
        };
        
        res.status(200).json({
            success: true,
            data: parsedConfig
        });
        
    } catch (error) {
        console.error('Error fetching company config:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch company configuration', 
            message: error.message 
        });
    }
}
