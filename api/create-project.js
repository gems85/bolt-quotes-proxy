// api/create-project.js
// This file goes in a folder called "api" in your Vercel project

export default async function handler(req, res) {
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
    const projectData = req.body;
    const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
    const BASE_ID = process.env.BASE_ID;
    const TABLE_NAME = process.env.TABLE_NAME || 'Projects';

    if (!AIRTABLE_PAT || !BASE_ID) {
      return res.status(500).json({ 
        error: 'Missing Airtable credentials' 
      });
    }

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

    const data = await airtableResponse.json();

    if (!airtableResponse.ok) {
      return res.status(airtableResponse.status).json({
        error: data.error?.message || 'Airtable request failed'
      });
    }

    return res.status(200).json({
      success: true,
      data: data
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
}
