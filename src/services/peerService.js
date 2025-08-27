import { supabase } from '../config/supabase';
import { TABLES } from '../config/supabase';

class PeerService {
  // Get available chat rooms
  async getChatRooms(category = null) {
    try {
      let query = supabase
        .from('chat_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Join a chat room
  async joinChatRoom(roomId, userId) {
    try {
      // Check if user is already in the room
      const { data: existing } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('room_participants')
          .insert([{
            room_id: roomId,
            user_id: userId,
            joined_at: new Date().toISOString(),
          }]);

        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Leave a chat room
  async leaveChatRoom(roomId, userId) {
    try {
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send a message to a chat room
  async sendMessage(messageData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.PEER_MESSAGES)
        .insert([{
          room_id: messageData.roomId,
          sender_id: messageData.senderId,
          content: messageData.content,
          type: messageData.type || 'text',
          created_at: new Date().toISOString(),
        }])
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get messages for a chat room
  async getMessages(roomId, limit = 50, offset = 0) {
    try {
      const { data, error } = await supabase
        .from(TABLES.PEER_MESSAGES)
        .select(`
          *,
          sender:users(display_name, avatar_url, is_anonymous)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { success: true, data: data.reverse() }; // Reverse to show oldest first
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Subscribe to real-time messages
  subscribeToMessages(roomId, callback) {
    return supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLES.PEER_MESSAGES,
          filter: `room_id=eq.${roomId}`,
        },
        callback
      )
      .subscribe();
  }

  // Unsubscribe from real-time messages
  unsubscribeFromMessages(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }

  // Report inappropriate content
  async reportMessage(messageId, reason, reporterId) {
    try {
      const { data, error } = await supabase
        .from('message_reports')
        .insert([{
          message_id: messageId,
          reporter_id: reporterId,
          reason,
          created_at: new Date().toISOString(),
        }]);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Block a user
  async blockUser(userId, blockedUserId) {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert([{
          user_id: userId,
          blocked_user_id: blockedUserId,
          created_at: new Date().toISOString(),
        }]);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get user's blocked list
  async getBlockedUsers(userId) {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_user_id')
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true, data: data.map(item => item.blocked_user_id) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Find peer matches based on interests
  async findPeerMatches(userId, interests = []) {
    try {
      // This is a simplified matching algorithm
      // In production, you'd want more sophisticated matching
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, preferences')
        .neq('id', userId)
        .eq('is_anonymous', false)
        .limit(10);

      if (error) throw error;

      // Filter users with similar interests
      const matches = data.filter(user => {
        if (!user.preferences || !user.preferences.interests) return false;
        
        const commonInterests = interests.filter(interest => 
          user.preferences.interests.includes(interest)
        );
        
        return commonInterests.length > 0;
      });

      return { success: true, data: matches };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Create a direct message conversation
  async createDirectMessage(userId, peerId) {
    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(user1_id.eq.${userId},user2_id.eq.${peerId}),and(user1_id.eq.${peerId},user2_id.eq.${userId})`)
        .single();

      if (existing) {
        return { success: true, data: existing };
      }

      // Create new conversation
      const { data, error } = await supabase
        .from('direct_messages')
        .insert([{
          user1_id: userId,
          user2_id: peerId,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get user's direct message conversations
  async getDirectMessages(userId) {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          user1:users!user1_id(display_name, avatar_url, is_anonymous),
          user2:users!user2_id(display_name, avatar_url, is_anonymous)
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new PeerService();