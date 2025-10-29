// api/project-operations.js
// Consolidated endpoint for project operations
// Replaces: get-project.js, get-projects.js, update-project-status.js

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
    const BASE_ID = process.env.BASE_ID;
    const PROJECTS_TABLE = process.env.PROJECTS_TABLE;

    // GET: Fetch projects (single or all)
    if (req.method === 'GET') {
        const { projectId } = req.query;

        // Get single project (from get-project.js)
        if (projectId) {
            try {
                if (!projectId) {
                    return res.status(400).json({ error: 'Project ID is required' });
                }

                const response = await fetch(
                    `https://api.airtable.com/v0/${BASE_ID}/Projects/${projectId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${AIRTABLE_TOKEN}`
                        }
                    }
                );

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error?.message || 'Failed to load project');
                }

                const data = await response.json();
                return res.status(200).json(data);

            } catch (error) {
                console.error('Error loading project:', error);
                return res.status(500).json({
                    error: 'Failed to load project',
                    message: error.message
                });
            }
        }

        // Get all projects (from get-projects.js)
        try {
            const response = await fetch(
                `https://api.airtable.com/v0/${BASE_ID}/Projects?sort%5B0%5D%5Bfield%5D=Created%20At&sort%5B0%5D%5Bdirection%5D=desc`,
                {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_TOKEN}`
                    }
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to load projects');
            }

            const data = await response.json();
            return res.status(200).json(data);

        } catch (error) {
            console.error('Error loading projects:', error);
            return res.status(500).json({
                error: 'Failed to load projects',
                message: error.message
            });
        }
    }

    // POST: Update project status (from update-project-status.js)
    if (req.method === 'POST') {
        if (!AIRTABLE_TOKEN) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        try {
            const { projectId, status } = req.body;

            if (!projectId || !status) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Update project status in Airtable
            const response = await fetch(
                `https://api.airtable.com/v0/${BASE_ID}/${PROJECTS_TABLE}/${projectId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fields: {
                            'Project Status': status
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Airtable error:', errorData);
                throw new Error('Failed to update project status');
            }

            const result = await response.json();

            return res.status(200).json({
                success: true,
                project: result
            });

        } catch (error) {
            console.error('Status update error:', error);
            return res.status(500).json({
                error: 'Failed to update project status',
                message: error.message
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
