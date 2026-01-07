/**
 * Supabase Cloud Sync Integration
 * Replaces localStorage with cloud-based storage
 * 
 * Setup:
 * 1. Create a Supabase project at supabase.com
 * 2. Add your credentials below
 * 3. Run the SQL schema from SUPABASE_SETUP.md
 */

// ===== CONFIGURATION =====
// Get these from: Supabase Dashboard > Settings > API
const SUPABASE_URL = 'https://ifenrtairzmitoprjtwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZW5ydGFpcnptaXRvcHJqdHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjE2MjMsImV4cCI6MjA4MzMzNzYyM30.-Aj4uwb-uOeeODcUmNJGidGHxA0JFPT0Gi-9W6VLilk';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Cloud Sync Manager =====
const CloudSync = {
    isOnline: navigator.onLine,
    syncQueue: [], // Queue changes when offline
    userId: null,
    syncInterval: null,

    // Initialize cloud sync
    async init() {
        // Set up online/offline listeners
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Get current user from Supabase auth
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            this.userId = user.id;
            await this.pullData(); // Load data from cloud on startup
        }

        // Auto-sync every 30 seconds
        this.syncInterval = setInterval(() => this.pushData(), 30000);
    },

    // Pull data from cloud (load latest from Supabase)
    async pullData() {
        if (!this.userId) return;

        try {
            console.log('Pulling data from Supabase...');
            
            const [projectsRes, filesRes, collectionsRes, timestampsRes] = await Promise.all([
                supabaseClient.from('projects').select('*').eq('user_id', this.userId),
                supabaseClient.from('files').select('*').eq('user_id', this.userId),
                supabaseClient.from('collections').select('*').eq('user_id', this.userId),
                supabaseClient.from('timestamps').select('*').eq('user_id', this.userId)
            ]);

            if (projectsRes.error) throw projectsRes.error;
            if (filesRes.error) throw filesRes.error;
            if (collectionsRes.error) throw collectionsRes.error;
            if (timestampsRes.error) throw timestampsRes.error;

            // Update state with cloud data
            state.projects = projectsRes.data || [];
            state.files = filesRes.data || [];
            state.collections = collectionsRes.data || [];
            state.timestamps = timestampsRes.data || [];

            console.log('✓ Data pulled from cloud');
            return true;
        } catch (error) {
            console.error('Pull failed:', error);
            return false;
        }
    },

    // Push data to cloud (save changes to Supabase)
    async pushData() {
        if (!this.userId || !this.isOnline) {
            console.log('Cannot push: userId=' + this.userId + ', isOnline=' + this.isOnline);
            return;
        }

        try {
            console.log('Pushing data to Supabase for user:', this.userId);
            
            // Batch upsert all data types
            const uploadPromises = [
                state.projects.length > 0 ? supabaseClient.from('projects').upsert(
                    state.projects.map(p => ({ ...p, user_id: this.userId }))
                ) : Promise.resolve({ data: null, error: null }),
                
                state.files.length > 0 ? supabaseClient.from('files').upsert(
                    state.files.map(f => ({ ...f, user_id: this.userId }))
                ) : Promise.resolve({ data: null, error: null }),
                
                state.collections.length > 0 ? supabaseClient.from('collections').upsert(
                    state.collections.map(c => ({ ...c, user_id: this.userId }))
                ) : Promise.resolve({ data: null, error: null }),
                
                state.timestamps.length > 0 ? supabaseClient.from('timestamps').upsert(
                    state.timestamps.map(t => ({ ...t, user_id: this.userId }))
                ) : Promise.resolve({ data: null, error: null })
            ];

            const results = await Promise.all(uploadPromises);

            // Check for errors
            for (const result of results) {
                if (result && result.error) {
                    console.error('Supabase error:', result.error);
                    throw result.error;
                }
            }

            console.log('✓ Data pushed to cloud');
            this.syncQueue = []; // Clear offline queue
            return true;
        } catch (error) {
            console.error('Push failed:', error);
            return false;
        }
    },

    handleOnline() {
        this.isOnline = true;
        console.log('Back online - syncing...');
        this.pushData();
    },

    handleOffline() {
        this.isOnline = false;
        console.log('Offline - changes will sync when back online');
    },

    // Delete user data from cloud
    async deleteAllData() {
        if (!this.userId) return;

        try {
            await Promise.all([
                supabaseClient.from('timestamps').delete().eq('user_id', this.userId),
                supabaseClient.from('collections').delete().eq('user_id', this.userId),
                supabaseClient.from('files').delete().eq('user_id', this.userId),
                supabaseClient.from('projects').delete().eq('user_id', this.userId)
            ]);
            console.log('✓ All cloud data deleted');
        } catch (error) {
            console.error('Delete failed:', error);
        }
    },

    shutdown() {
        if (this.syncInterval) clearInterval(this.syncInterval);
    }
};

// ===== Export for use in main script =====
window.CloudSync = CloudSync;
