/**
 * Test script to verify the user profile foreign key constraint fix
 * Run this script to test if the fix resolves the "Key is not present in table users" error
 */

import { supabase } from './src/config/supabase.js';
import userProfileService from './src/services/userProfileService.js';

async function testUserProfileFix() {
  console.log('🔧 Testing User Profile Foreign Key Constraint Fix\n');

  try {
    // Step 1: Check if user is authenticated
    console.log('1. Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ No authenticated user found. Please sign in first.');
      console.log('   You can sign in through the app or create a test user.');
      return;
    }
    
    console.log(`✅ Authenticated user found: ${user.id}`);
    console.log(`   Email: ${user.email || 'N/A'}\n`);

    // Step 2: Ensure user profile exists
    console.log('2. Ensuring user profile exists...');
    const profileResult = await userProfileService.ensureUserProfile(user.id);
    
    if (!profileResult.success) {
      console.log(`❌ Failed to ensure user profile: ${profileResult.error}`);
      return;
    }
    
    if (profileResult.created) {
      console.log('✅ User profile was missing and has been created');
    } else {
      console.log('✅ User profile already exists');
    }
    console.log('');

    // Step 3: Test mood entry creation (this was failing before)
    console.log('3. Testing mood entry creation...');
    const { data: moodEntry, error: moodError } = await supabase
      .from('moods')
      .insert({
        user_id: user.id,
        mood: 4,
        energy: 3,
        anxiety: 2,
        emotions: ['happy', 'calm'],
        notes: 'Test mood entry to verify foreign key fix'
      })
      .select()
      .single();

    if (moodError) {
      console.log(`❌ Mood entry creation failed: ${moodError.message}`);
      console.log('   This indicates the foreign key constraint issue is not resolved.');
      return;
    }
    
    console.log(`✅ Mood entry created successfully: ${moodEntry.id}`);

    // Step 4: Test message sending (another common failure point)
    console.log('4. Testing message sending...');
    
    // Get a chat room first
    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('id, name')
      .limit(1);

    if (!rooms || rooms.length === 0) {
      console.log('⚠️  No chat rooms found, skipping message test');
    } else {
      const { data: message, error: messageError } = await supabase
        .from('peer_messages')
        .insert({
          room_id: rooms[0].id,
          sender_id: user.id,
          content: 'Test message to verify foreign key fix'
        })
        .select()
        .single();

      if (messageError) {
        console.log(`❌ Message creation failed: ${messageError.message}`);
        console.log('   This indicates the foreign key constraint issue is not resolved.');
        return;
      }
      
      console.log(`✅ Message sent successfully: ${message.id}`);
      
      // Clean up test message
      await supabase.from('peer_messages').delete().eq('id', message.id);
      console.log('   Test message cleaned up');
    }

    // Step 5: Clean up test mood entry
    console.log('5. Cleaning up test data...');
    await supabase.from('moods').delete().eq('id', moodEntry.id);
    console.log('✅ Test mood entry cleaned up\n');

    // Success summary
    console.log('🎉 SUCCESS: All tests passed!');
    console.log('   The foreign key constraint error has been resolved.');
    console.log('   Users can now log moods and send messages without errors.');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('   Stack trace:', error.stack);
  }
}

// Run the test
testUserProfileFix().then(() => {
  console.log('\n✨ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});