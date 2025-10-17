// api/projects.js
// Vercel Serverless Function to fetch projects and photos from Airtable

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
    const BASE_ID = process.env.BASE_ID;
    const PROJECTS_TABLE = 'tblhfewGPP306LVNX';
    const PHOTOS_TABLE = 'Photos';

    if (!AIRTABLE_TOKEN) {
        return res.status(500).json({ error: 'Airtable API token not configured' });
    }

    try {
        // Fetch projects
        const projectsResponse = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/${PROJECTS_TABLE}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!projectsResponse.ok) {
            const errorData = await projectsResponse.json();
            console.error('Airtable API Error:', errorData);
            return res.status(projectsResponse.status).json({ 
                error: 'Failed to fetch projects from Airtable',
                details: errorData
            });
        }

        const projectsData = await projectsResponse.json();
        
        // Fetch all photos
        const photosResponse = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/${PHOTOS_TABLE}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        let photosData = { records: [] };
        if (photosResponse.ok) {
            photosData = await photosResponse.json();
        }

        // Attach photos to their respective projects
        const projectsWithPhotos = projectsData.records.map(project => {
            const projectId = project.fields['Project ID'];
            const projectPhotos = photosData.records.filter(photo => 
                photo.fields['Project'] === projectId || 
                (Array.isArray(photo.fields['Project']) && photo.fields['Project'].includes(project.id))
            );
            
            return {
                ...project,
                photos: projectPhotos
            };
        });
        
        // Return the projects with photos
        return res.status(200).json({
            success: true,
            projects: projectsWithPhotos
        });

    } catch (error) {
        console.error('Error fetching projects:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
