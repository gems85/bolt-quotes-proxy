// api/create-project.js
// This file goes in a folder called "api" in your Vercel project

export default async function handler(req, res) {
  // Enable CORS so your GoDaddy site can call this
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
    // Get the project data from the request body
    const projectData = req.body;

    // Your Airtable credentials (stored as environment variables in Vercel)
    const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
    const BASE_ID = process.env.BASE_ID;
    const TABLE_NAME = process.env.TABLE_NAME || 'Projects';

    if (!AIRTABLE_PAT || !BASE_ID) {
      return res.status(500).json({ 
        error: 'Server configuration error: Missing Airtable credentials' 
      });
    }

    // Make the request to Airtable
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_PAT}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      }
    );

    // Get the response from Airtable
    const data = await airtableResponse.json();

    // If Airtable returned an error, forward it
    if (!airtableResponse.ok) {
      return res.status(airtableResponse.status).json({
        error: data.error?.message || 'Airtable request failed',
        details: data
      });
    }

    // Success! Return the created project data
    return res.status(200).json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}