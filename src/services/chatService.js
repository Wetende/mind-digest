import { supabase } from '../config/supabase';
import userProfileService from './userProfileService';

class ChatService {
  // Get all chat rooms
  async getChatRooms() {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          peer_messages(
            id,
            content,
            created_at,
            sender_id,
            users(display_name, is_anonymous)
          )
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process rooms to add member count and last message info
      const processedRooms = data.map(room => {
        const messages = room.peer_messages || [];
        const lastMessage = messages[messages.length - 1];
        
        return {
          ...room,
          memberCount: this.getMemberCount(room.id), // We'll implement this
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            time: this.formatTime(lastMessage.created_at),
            sender: lastMessage.users?.display_name || 'Anonymous'
          } : null,
          peer_messages: undefined // Remove from response
        };
      });

      return { success: true, data: processedRooms };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get messages for a specific room
  async getRoomMessages(roomId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('peer_messages')
        .select(`
          *,
          users(display_name, is_anonymous, avatar_url)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      const processedMessages = data.map(message => ({
        id: message.id,
        content: message.content,
        senderId: message.sender_id,
        senderName: message.users?.is_anonymous ? 'Anonymous' : (message.users?.display_name || 'Unknown'),
        senderAvatar: message.users?.avatar_url,
        isAnonymous: message.users?.is_anonymous || false,
        timestamp: message.created_at,
        type: message.type || 'text',
        isModerated: message.is_moderated
      }));

      return { success: true, data: processedMessages };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send a message to a room
  async sendMessage(roomId, content, userId) {
    try {
      // Ensure user profile exists before sending message
      const profileResult = await userProfileService.ensureUserProfile(userId);
      if (!profileResult.success) {
        throw new Error(`Failed to ensure user profile: ${profileResult.error}`);
      }

      const { data, error } = await supabase
        .from('peer_messages')
        .insert({
          room_id: roomId,
          sender_id: userId,
          content: content.trim(),
          type: 'text'
        })
        .select(`
          *,
          users(display_name, is_anonymous, avatar_url)
        `)
        .single();

      if (error) throw error;

      const processedMessage = {
        id: data.id,
        content: data.content,
        senderId: data.sender_id,
        senderName: data.users?.is_anonymous ? 'Anonymous' : (data.users?.display_name || 'Unknown'),
        senderAvatar: data.users?.avatar_url,
        isAnonymous: data.users?.is_anonymous || false,
        timestamp: data.created_at,
        type: data.type || 'text',
        isModerated: data.is_moderated
      };

      return { success: true, data: processedMessage };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Subscribe to real-time messages for a room
  subscribeToRoom(roomId, callback) {
    const subscription = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'peer_messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          // Fetch the complete message with user data
          const { data } = await supabase
            .from('peer_messages')
            .select(`
              *,
              users(display_name, is_anonymous, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const processedMessage = {
              id: data.id,
              content: data.content,
              senderId: data.sender_id,
              senderName: data.users?.is_anonymous ? 'Anonymous' : (data.users?.display_name || 'Unknown'),
              senderAvatar: data.users?.avatar_url,
              isAnonymous: data.users?.is_anonymous || false,
              timestamp: data.created_at,
              type: data.type || 'text',
              isModerated: data.is_moderated
            };

            callback(processedMessage);
          }
        }
      )
      .subscribe();

    return subscription;
  }

  // Unsubscribe from room
  unsubscribeFromRoom(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }

  // Join a room (for future implementation)
  async joinRoom(roomId, userId) {
    // This could be implemented with a room_members table
    // For now, we'll just return success
    return { success: true };
  }

  // Leave a room (for future implementation)
  async leaveRoom(roomId, userId) {
    // This could be implemented with a room_members table
    // For now, we'll just return success
    return { success: true };
  }

  // Get member count for a room (simplified for now)
  getMemberCount(roomId) {
    // This would typically query a room_members table
    // For now, return a mock count based on room ID
    const mockCounts = {
      1: 127,
      2: 89,
      3: 156,
      4: 45
    };
    return mockCounts[roomId] || Math.floor(Math.random() * 200) + 20;
  }

  // Format timestamp for display
  formatTime(timestamp) {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return messageTime.toLocaleDateString();
  }

  // Report a message (for moderation)
  async reportMessage(messageId, reason, reporterId) {
    try {
      // This would typically insert into a reports table
      // For now, we'll just log it
      console.log(`Message ${messageId} reported by ${reporterId} for: ${reason}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Delete a message (for users' own messages)
  async deleteMessage(messageId, userId) {
    try {
      const { error } = await supabase
        .from('peer_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', userId); // Only allow users to delete their own messages

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Add reaction to a message
  async addReaction(messageId, userId, reaction) {
    try {
      // First get the current message to update reactions
      const { data: message, error: fetchError } = await supabase
        .from('peer_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      const currentReactions = message.reactions || {};
      const reactionUsers = currentReactions[reaction] || [];
      
      // Toggle reaction - add if not present, remove if present
      let updatedUsers;
      if (reactionUsers.includes(userId)) {
        updatedUsers = reactionUsers.filter(id => id !== userId);
      } else {
        updatedUsers = [...reactionUsers, userId];
      }

      // Update reactions object
      const updatedReactions = { ...currentReactions };
      if (updatedUsers.length > 0) {
        updatedReactions[reaction] = updatedUsers;
      } else {
        delete updatedReactions[reaction];
      }

      // Update the message
      const { data, error } = await supabase
        .from('peer_messages')
        .update({ reactions: updatedReactions })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send typing indicator
  async sendTypingIndicator(roomId, userId, isTyping) {
    try {
      // In a real implementation, this would use a separate typing_indicators table
      // or real-time presence features. For now, we'll simulate it.
      console.log(`User ${userId} ${isTyping ? 'started' : 'stopped'} typing in room ${roomId}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get online users in a room
  async getOnlineUsers(roomId) {
    try {
      // This would typically query a presence/online_users table
      // For now, return mock data
      return { 
        success: true, 
        data: [
          { id: 'user1', name: 'Anonymous User', lastSeen: new Date() },
          { id: 'user2', name: 'Mindful Mike', lastSeen: new Date() }
        ]
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new ChatService();