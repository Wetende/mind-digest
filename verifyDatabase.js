/**
 * Database Verification Script
 * Checks if all required tables exist and have proper permissions
 */

import { supabase } from './src/config/supabase.js';

async function verifyDatabase() {
  console.log('🔍 Verifying Database Setup\n');

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ No authenticated user found. Please sign in first.');
      return;
    }
    
    console.log(`✅ Authenticated as: ${user.email || user.id}\n`);

    // List of required tables
    const requiredTables = [
      'users',
      'moods', 
      'journal_entries',
      'peer_messages',
      'chat_rooms',
      'user_habit_stats',
      'user_badges',
      'habit_activities',
      'user_behavior_data',
      'user_behavior_profiles'
    ];

    console.log('📋 Checking Required Tables:\n');

    const tableStatus = {};

    for (const tableName of requiredTables) {
      try {
        // Try to query the table with a limit to check if it exists and is accessible
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          if (error.message.includes('relation') || error.message.includes('does not exist')) {
            console.log(`❌ ${tableName} - Table does not exist`);
            tableStatus[tableName] = 'missing';
          } else if (error.code === '42501' || error.message.includes('permission')) {
            console.log(`⚠️  ${tableName} - Permission denied (RLS policy issue)`);
            tableStatus[tableName] = 'permission_denied';
          } else {
            console.log(`⚠️  ${tableName} - Error: ${error.message}`);
            tableStatus[tableName] = 'error';
          }
        } else {
          console.log(`✅ ${tableName} - OK`);
          tableStatus[tableName] = 'ok';
        }
      } catch (err) {
        console.log(`❌ ${tableName} - Exception: ${err.message}`);
        tableStatus[tableName] = 'exception';
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    const okTables = Object.values(tableStatus).filter(status => status === 'ok').length;
    const totalTables = requiredTables.length;
    
    console.log(`✅ Working tables: ${okTables}/${totalTables}`);
    
    const missingTables = Object.entries(tableStatus)
      .filter(([, status]) => status === 'missing')
      .map(([table]) => table);
    
    if (missingTables.length > 0) {
      console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
      console.log('\n💡 To fix: Run the full supabase-setup.sql file in your Supabase SQL editor');
    }

    const permissionTables = Object.entries(tableStatus)
      .filter(([, status]) => status === 'permission_denied')
      .map(([table]) => table);
    
    if (permissionTables.length > 0) {
      console.log(`⚠️  Permission issues: ${permissionTables.join(', ')}`);
      console.log('\n💡 To fix: Check RLS policies in Supabase dashboard');
    }

    // Test core functionality
    console.log('\n🧪 Testing Core Functionality:');
    
    if (tableStatus.users === 'ok') {
      console.log('✅ User profiles: Available');
    } else {
      console.log('❌ User profiles: Not available - core functionality may fail');
    }

    if (tableStatus.moods === 'ok') {
      console.log('✅ Mood logging: Available');
    } else {
      console.log('❌ Mood logging: Not available');
    }

    if (tableStatus.peer_messages === 'ok' && tableStatus.chat_rooms === 'ok') {
      console.log('✅ Chat/Messaging: Available');
    } else {
      console.log('❌ Chat/Messaging: Not available');
    }

    if (tableStatus.user_habit_stats === 'ok' && tableStatus.user_badges === 'ok') {
      console.log('✅ Habit tracking: Available');
    } else {
      console.log('⚠️  Habit tracking: Limited functionality');
    }

    if (tableStatus.user_behavior_data === 'ok' && tableStatus.user_behavior_profiles === 'ok') {
      console.log('✅ Behavior learning: Available');
    } else {
      console.log('⚠️  Behavior learning: Not available (optional feature)');
    }

    console.log('\n🎯 Recommendations:');
    
    if (okTables === totalTables) {
      console.log('🎉 All tables are working! Your database is properly set up.');
    } else if (okTables >= 6) {
      console.log('👍 Core functionality should work. Some advanced features may be limited.');
      console.log('   Consider running the full database setup for complete functionality.');
    } else {
      console.log('⚠️  Many tables are missing. Please run the supabase-setup.sql file.');
      console.log('   The app may have limited functionality until the database is properly set up.');
    }

  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
  }
}

// Run the verification
verifyDatabase().then(() => {
  console.log('\n✨ Database verification completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});