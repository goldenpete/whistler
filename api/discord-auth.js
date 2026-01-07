export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code } = req.body;
    
    if (!code) {
        return res.status(400).json({ error: 'Missing authorization code' });
    }

    try {
        // Exchange code for token with Discord
        const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.DISCORD_REDIRECT_URI
            })
        });

        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
            console.error('Token error:', tokenData);
            return res.status(400).json({ error: 'Failed to get access token', details: tokenData });
        }

        // Get user data from Discord
        const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        const discordUser = await userResponse.json();
        
        // Create or get Supabase user for this Discord user
        // Using the Supabase admin API (service role)
        const supabaseAdminUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        // Check if user exists in Supabase by discord_id
        const checkUserRes = await fetch(`${supabaseAdminUrl}/rest/v1/user_profiles?discord_id=eq.${discordUser.id}&select=id`, {
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        const existingUsers = await checkUserRes.json();
        let supabaseUserId;
        
        if (Array.isArray(existingUsers) && existingUsers.length > 0) {
            // User exists, use their ID
            supabaseUserId = existingUsers[0].id;
        } else {
            // Create new Supabase user with Discord auth
            const email = discordUser.email || `discord_${discordUser.id}@example.com`;
            const password = `discord_${discordUser.id}_${Date.now()}`;
            
            const createUserRes = await fetch(`${supabaseAdminUrl}/auth/v1/admin/users`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    email_confirm: true,
                    user_metadata: {
                        discord_id: discordUser.id,
                        discord_username: discordUser.username
                    }
                })
            });
            
            const createdUser = await createUserRes.json();
            if (createdUser.id) {
                supabaseUserId = createdUser.id;
                
                // Also create user_profiles entry
                await fetch(`${supabaseAdminUrl}/rest/v1/user_profiles`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseServiceKey,
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id: supabaseUserId,
                        discord_id: discordUser.id,
                        discord_username: discordUser.username
                    })
                });
            } else {
                throw new Error('Failed to create Supabase user');
            }
        }

        return res.status(200).json({
            user: {
                discord_id: discordUser.id,
                supabase_id: supabaseUserId,
                username: discordUser.username,
                discriminator: discordUser.discriminator,
                email: discordUser.email,
                avatar: discordUser.avatar
            }
        });
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ error: 'Authentication failed', message: error.message });
    }
}
