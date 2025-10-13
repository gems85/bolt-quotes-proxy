export default async function handler(req, res) {
  // Enable CORS so GoDaddy site can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const formData = req.body;

    // Get credentials from environment variables
    const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
    const BASE_ID = process.env.BASE_ID;
    const WAITLIST_TABLE = 'Waitlist';

    if (!AIRTABLE_PAT || !BASE_ID) {
      return res.status(500).json({ 
        error: 'Server configuration error' 
      });
    }

    // Send to Airtable
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${WAITLIST_TABLE}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_PAT}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'Name': formData.name,
            'Email': formData.email,
            'Phone': formData.phone || '',
            'Business Name': formData.business || '',
            'Quote Volume': formData.quoteVolume,
            'Signup Date': new Date().toISOString()
          }
        })
      }
    );

    const data = await airtableResponse.json();

    if (!airtableResponse.ok) {
      return res.status(airtableResponse.status).json({
        error: data.error?.message || 'Failed to save to database'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully added to waitlist'
    });

  } catch (error) {
    console.error('Waitlist error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
