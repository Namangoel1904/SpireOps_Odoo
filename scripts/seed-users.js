// scripts/seed-users.js
// Run with: node scripts/seed-users.js
// Requirements: npm install dotenv @supabase/supabase-js

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const usersToSeed = [
  { email: 'admin@spireops.com', password: 'password123', full_name: 'Taylor Chen', role: 'admin' },
  { email: 'fleet@spireops.com', password: 'password123', full_name: 'Jordan Lee', role: 'fleet_manager' },
  { email: 'safety@spireops.com', password: 'password123', full_name: 'Casey Smith', role: 'safety_officer' },
  { email: 'finance@spireops.com', password: 'password123', full_name: 'Morgan Davis', role: 'financial_analyst' },
  { email: 'driver@spireops.com', password: 'password123', full_name: 'Alex Morgan', role: 'driver' },
];

async function seedUsers() {
  console.log('🌱 Seeding Supabase Auth Users...');

  for (const user of usersToSeed) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        role: user.role // This sets the role on the profile via the trigger!
      }
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`⚠️ User already exists: ${user.email}`);
        
        // Let's force update their role in the profiles table just in case
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers.users.find(u => u.email === user.email);
        if (existing) {
          await supabase.from('profiles').update({ role: user.role }).eq('id', existing.id);
          console.log(`   -> Forced role update to '${user.role}' in profiles table.`);
        }
      } else {
        console.error(`❌ Error creating ${user.email}:`, error.message);
      }
    } else {
      console.log(`✅ Created user: ${user.email} (${user.role})`);
    }
  }

  console.log('🎉 Seeding complete!');
}

seedUsers();
