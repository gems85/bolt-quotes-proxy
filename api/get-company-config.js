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

        // Parse JSON fields
        let rebates = [];
        let financingPlans = [];
        let whatsIncluded = [];
        let optionalAddons = [];
        
        try {
            if (config['Rebates']) {
                rebates = typeof config['Rebates'] === 'string' 
                    ? JSON.parse(config['Rebates']) 
                    : config['Rebates'];
            }
        } catch (e) {
            console.error('Error parsing Rebates:', e);
        }
        
        try {
            if (config['Financing Plans']) {
                financingPlans = typeof config['Financing Plans'] === 'string'
                    ? JSON.parse(config['Financing Plans'])
                    : config['Financing Plans'];
            }
        } catch (e) {
            console.error('Error parsing Financing Plans:', e);
        }
        
        try {
            if (config["What's Included"]) {
                whatsIncluded = typeof config["What's Included"] === 'string'
                    ? JSON.parse(config["What's Included"])
                    : config["What's Included"];
            }
        } catch (e) {
            console.error("Error parsing What's Included":', e);
        }
        
         try {
            if (config['Optional Addons']) {
                optionalAddons = typeof config['Optional Addons'] === 'string'
                    ? JSON.parse(config['Optional Addons'])
                    : config['Optional Addons'];
            }
        } catch (e) {
            console.error('Error parsing Optional Addons:', e);
        }
        
        res.status(200).json({
            success: true,
            data: {
                companyName: config['Company Name'] || 'EV Charger Installation',
                logo: config['Logo']?.[0]?.url || '',
                address: config['Address'] || '',
                phone: config['Phone'] || '',
                email: config['Email'] || '',
                licenseNumber: config['License Number'] || '',
                website: config['Website'] || '',
                rebates: rebates,
                financingPlans: financingPlans,
                whatsIncluded: whatsIncluded,
                optionalAddons: optionalAddons    
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
