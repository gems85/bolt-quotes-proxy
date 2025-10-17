export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return the config from environment variables
  res.status(200).json({
    airtableToken: process.env.AIRTABLE_PAT,
    baseId: process.env.BASE_ID,
    tableName: process.env.TABLE_NAME
    photosTable: process.env.PHOTOS_TABLE,
    projectsTable: process.env.PROJECTS_TABLE,
    quotesTable: process.env.PROJECTS_TABLE,  
  });
}
