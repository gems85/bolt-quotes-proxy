// api/update-project-status.js
// Updates the project status after photos are uploaded

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
    const BASE_ID = 'applWK4PXoo86ajvD';
    const PROJECTS_TABLE = 'Projects';

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
