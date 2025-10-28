export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const quoteData = req.body;
        
        if (!quoteData.quoteId) {
            return res.status(400).json({ 
                success: false,
                error: 'Quote ID is required' 
            });
        }
        
        const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_PAT;
        const BASE_ID = process.env.BASE_ID;
        const QUOTES_TABLE = process.env.QUOTES_TABLE || 'QUOTES';
        
        if (!AIRTABLE_TOKEN || !BASE_ID) {
            throw new Error('Missing Airtable credentials');
        }
        
        // Find the quote record in Airtable by Quote ID
        const filterFormula = `{Quote ID} = '${quoteData.quoteId}'`;
        const searchResponse = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/${QUOTES_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`
                }
            }
        );
        
        if (!searchResponse.ok) {
            throw new Error('Failed to find quote record');
        }
        
        const searchData = await searchResponse.json();
        
        if (!searchData.records || searchData.records.length === 0) {
            throw new Error(`Quote ${quoteData.quoteId} not found in Airtable`);
        }
        
        const recordId = searchData.records[0].id;
        
        // Prepare fields to update
        const fields = {
            'Customer Name': quoteData.customerName,
            'Charger Type': quoteData.chargerType,
            'Panel Capacity (Amps)': quoteData.panelCapacity,
            'Available Breaker Slots': quoteData.availableSlots,
            'Distance (feet)': quoteData.distance,
            'Conduit Type': quoteData.conduitType,
            'Equipment Cost': quoteData.materials,
            'Materials Cost': quoteData.materials,
            'Labor Cost': quoteData.labor,
            'Labor Hours': quoteData.laborHours,
            'Permits Cost': quoteData.permit,
            'Subtotal': quoteData.subtotal,
            'Margin Percent': quoteData.markup,
            'Margin Amount': quoteData.markupAmount,
            'Total Cost': quoteData.total,
            'Total Amount': quoteData.total,
            'Panel Upgrade Required': quoteData.panelUpgrade > 0,
            'Valid Until': quoteData.validUntil,
            'Date Issued': quoteData.dateIssued
        };
        
        // Update the quote record
        const updateResponse = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/${QUOTES_TABLE}/${recordId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fields })
            }
        );
        
        if (!updateResponse.ok) {
            const error = await updateResponse.json();
            throw new Error(`Failed to update Airtable: ${error.error?.message || 'Unknown error'}`);
        }
        
        const updatedRecord = await updateResponse.json();
        
        res.status(200).json({
            success: true,
            data: updatedRecord,
            message: 'Quote saved successfully'
        });
        
    } catch (error) {
        console.error('Error saving quote:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to save quote', 
            message: error.message 
        });
    }
}
