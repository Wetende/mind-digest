/**
 * Script to check current database tables and apply schema updates
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
const supabaseUrl = 'https://irsspvoiyjconvexmrha.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlyc3Nwdm9peWpjb252ZXhtcmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDY5MDUsImV4cCI6MjA3MTg4MjkwNX0.T-rn-_MlgMR8JbcMGzN2qtx9IFCIJbgQ5gBy7e03ekA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentTables() {
  try {
    console.log('🔍 Checking current database tables...\n');
    
    // Get list of tables in public schema
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (error) {
      console.error('❌ Error fetching tables:', error);
      return;
    }
    
    console.log('📋 Current tables in database:');
    console.log('================================');
    
    if (data && data.length > 0) {
      data.forEach((table, index) => {
        console.log(`${index + 1}. ${table.table_name}`);
      });
    } else {
      console.log('No tables found in public schema');
    }
    
    console.log(`\n📊 Total tables: ${data?.length || 0}\n`);
    
    return data?.map(t => t.table_name) || [];
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    return [];
  }
}

async function checkTableStructure(tableName) {
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');
    
    if (error) {
      console.error(`❌ Error fetching structure for ${tableName}:`, error);
      return;
    }
    
    console.log(`\n🏗️  Structure of table: ${tableName}`);
    console.log('----------------------------------------');
    
    if (data && data.length > 0) {
      data.forEach(column => {
        const nullable = column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = column.column_default ? ` DEFAULT ${column.column_default}` : '';
        console.log(`  ${column.column_name}: ${column.data_type} ${nullable}${defaultVal}`);
      });
    } else {
      console.log('  No columns found');
    }
    
  } catch (error) {
    console.error(`❌ Error checking structure for ${tableName}:`, error);
  }
}

async function testUserProfileCreation() {
  try {
    console.log('\n🧪 Testing user profile creation...');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('⚠️  No authenticated user found. Please sign in first.');
      return;
    }
    
    console.log(`👤 Current user: ${user.id}`);
    
    // Check if user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error checking user profile:', profileError);
      return;
    }
    
    if (profile) {
      console.log('✅ User profile exists in users table');
      console.log(`   Display name: ${profile.display_name}`);
      console.log(`   Created: ${profile.created_at}`);
    } else {
      console.log('❌ User profile missing in users table');
      console.log('   This is likely the cause of the messaging error');
      
      // Try to create the profile
      console.log('🔧 Attempting to create user profile...');
      
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          display_name: user.email?.split('@')[0] || 'Mind-digest User',
          is_anonymous: false,
          preferences: {},
          mental_health_profile: {},
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Failed to create user profile:', createError);
      } else {
        console.log('✅ User profile created successfully!');
        console.log(`   Display name: ${newProfile.display_name}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing user profile:', error);
  }
}

async function testMessaging() {
  try {
    console.log('\n💬 Testing messaging functionality...');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('⚠️  No authenticated user found. Please sign in first.');
      return;
    }
    
    // Get first available chat room
    const { data: rooms, error: roomError } = await supabase
      .from('chat_rooms')
      .select('id, name')
      .limit(1);
    
    if (roomError) {
      console.error('❌ Error fetching chat rooms:', roomError);
      return;
    }
    
    if (!rooms || rooms.length === 0) {
      console.log('⚠️  No chat rooms found');
      return;
    }
    
    const room = rooms[0];
    console.log(`🏠 Using room: ${room.name} (${room.id})`);
    
    // Try to send a test message
    const testMessage = `Test message from database check script - ${new Date().toISOString()}`;
    
    const { data: message, error: messageError } = await supabase
      .from('peer_messages')
      .insert({
        room_id: room.id,
        sender_id: user.id,
        content: testMessage,
        type: 'text'
      })
      .select()
      .single();
    
    if (messageError) {
      console.error('❌ Failed to send test message:', messageError);
      console.log('   This confirms the foreign key constraint issue');
    } else {
      console.log('✅ Test message sent successfully!');
      console.log(`   Message ID: ${message.id}`);
      
      // Clean up test message
      await supabase
        .from('peer_messages')
        .delete()
        .eq('id', message.id);
      
      console.log('🧹 Test message cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Error testing messaging:', error);
  }
}

async function main() {
  console.log('🚀 Mind-digest Database Check & Update Script');
  console.log('==============================================\n');
  
  // Check current tables
  const tables = await checkCurrentTables();
  
  // Check structure of key tables
  const keyTables = ['users', 'peer_messages', 'chat_rooms'];
  for (const table of keyTables) {
    if (tables.includes(table)) {
      await checkTableStructure(table);
    } else {
      console.log(`\n⚠️  Table '${table}' not found in database`);
    }
  }
  
  // Test user profile creation
  await testUserProfileCreation();
  
  // Test messaging
  await testMessaging();
  
  console.log('\n✨ Database check complete!');
  console.log('\nNext steps:');
  console.log('1. If tables are missing, run the supabase-setup.sql script');
  console.log('2. If user profile is missing, the script attempted to create it');
  console.log('3. Try sending a message in the app to test the fix');
}

// Run the script
main().catch(console.error);