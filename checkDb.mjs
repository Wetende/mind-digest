/**
 * Simple database check script
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://irsspvoiyjconvexmrha.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlyc3Nwdm9peWpjb252ZXhtcmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDY5MDUsImV4cCI6MjA3MTg4MjkwNX0.T-rn-_MlgMR8JbcMGzN2qtx9IFCIJbgQ5gBy7e03ekA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Checking database tables...\n');
  
  // Try to query each expected table
  const expectedTables = [
    'users',
    'peer_messages', 
    'chat_rooms',
    'moods',
    'journal_entries',
    'wellness_plans',
    'wellness_tasks',
    'habit_activities',
    'user_habit_stats'
  ];
  
  const existingTables = [];
  const missingTables = [];
  
  for (const table of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
        missingTables.push(table);
      } else {
        console.log(`✅ ${table}: exists`);
        existingTables.push(table);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
      missingTables.push(table);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Existing tables: ${existingTables.length}`);
  console.log(`   Missing tables: ${missingTables.length}`);
  
  if (missingTables.length > 0) {
    console.log(`\n⚠️  Missing tables: ${missingTables.join(', ')}`);
    console.log('   You need to run the supabase-setup.sql script');
  }
  
  return { existingTables, missingTables };
}

async function checkUserProfile() {
  console.log('\n👤 Checking user authentication...');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.log('⚠️  No authenticated user found');
      console.log('   Please sign in to the app first, then run this script');
      return null;
    }
    
    console.log(`✅ Authenticated user: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    
    // Check if user profile exists in users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.log('❌ User profile missing in users table');
        return { user, profile: null };
      } else {
        console.log(`❌ Error checking profile: ${profileError.message}`);
        return null;
      }
    }
    
    console.log('✅ User profile exists in users table');
    console.log(`   Display name: ${profile.display_name}`);
    
    return { user, profile };
    
  } catch (err) {
    console.log(`❌ Error checking user: ${err.message}`);
    return null;
  }
}

async function createUserProfile(user) {
  console.log('\n🔧 Creating user profile...');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        display_name: user.email?.split('@')[0] || 'Mind-digest User',
        is_anonymous: false,
        preferences: {},
        mental_health_profile: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.log(`❌ Failed to create profile: ${error.message}`);
      return false;
    }
    
    console.log('✅ User profile created successfully!');
    console.log(`   Display name: ${data.display_name}`);
    return true;
    
  } catch (err) {
    console.log(`❌ Error creating profile: ${err.message}`);
    return false;
  }
}

async function testMessaging(user) {
  console.log('\n💬 Testing messaging...');
  
  try {
    // Get a chat room
    const { data: rooms, error: roomError } = await supabase
      .from('chat_rooms')
      .select('id, name')
      .limit(1);
    
    if (roomError || !rooms || rooms.length === 0) {
      console.log('⚠️  No chat rooms found');
      return false;
    }
    
    const room = rooms[0];
    console.log(`🏠 Testing with room: ${room.name}`);
    
    // Try to send a test message
    const { data, error } = await supabase
      .from('peer_messages')
      .insert({
        room_id: room.id,
        sender_id: user.id,
        content: 'Database check test message',
        type: 'text'
      })
      .select()
      .single();
    
    if (error) {
      console.log(`❌ Messaging failed: ${error.message}`);
      return false;
    }
    
    console.log('✅ Test message sent successfully!');
    
    // Clean up
    await supabase
      .from('peer_messages')
      .delete()
      .eq('id', data.id);
    
    console.log('🧹 Test message cleaned up');
    return true;
    
  } catch (err) {
    console.log(`❌ Messaging test error: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Mind-digest Database Check');
  console.log('=============================\n');
  
  // Check tables
  const { existingTables, missingTables } = await checkTables();
  
  // Check user profile
  const userCheck = await checkUserProfile();
  
  if (userCheck) {
    const { user, profile } = userCheck;
    
    // Create profile if missing
    if (!profile && existingTables.includes('users')) {
      const created = await createUserProfile(user);
      if (created) {
        // Test messaging after creating profile
        await testMessaging(user);
      }
    } else if (profile) {
      // Test messaging with existing profile
      await testMessaging(user);
    }
  }
  
  console.log('\n✨ Check complete!');
  
  if (missingTables.length > 0) {
    console.log('\n📋 Next steps:');
    console.log('1. Run the SQL setup script to create missing tables');
    console.log('2. Sign in to the app if you haven\'t already');
    console.log('3. Run this script again to verify the fix');
  }
}

main().catch(console.error);