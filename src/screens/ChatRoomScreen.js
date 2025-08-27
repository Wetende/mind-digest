import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { chatService } from '../services';
import { LoadingSpinner } from '../components';
import { theme } from '../theme';

export default function ChatRoomScreen({ route, navigation }) {
  const { room } = route.params;
  const { user, isAnonymous } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);
  const subscriptionRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    loadMessages();
    subscribeToMessages();

    return () => {
      if (subscriptionRef.current) {
        chatService.unsubscribeFromRoom(subscriptionRef.current);
      }
    };
  }, [room.id]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const result = await chatService.getRoomMessages(room.id);
      if (result.success) {
        setMessages(result.data);
      } else {
        Alert.alert('Error', 'Failed to load messages');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong loading messages');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    subscriptionRef.current = chatService.subscribeToRoom(room.id, (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
      // Auto-scroll to bottom when new message arrives
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
  };

  const handleTyping = (text) => {
    setNewMessage(text);
    
    if (text.trim() && !isTyping) {
      setIsTyping(true);
      // Send typing indicator
      chatService.sendTypingIndicator(room.id, user.id, true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      chatService.sendTypingIndicator(room.id, user.id, false);
    }, 2000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);
    
    // Stop typing indicator
    setIsTyping(false);
    chatService.sendTypingIndicator(room.id, user.id, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      const result = await chatService.sendMessage(room.id, messageContent, user.id);
      if (!result.success) {
        Alert.alert('Error', 'Failed to send message');
        setNewMessage(messageContent); // Restore message on error
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong sending message');
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId, reaction) => {
    try {
      const result = await chatService.addReaction(messageId, user.id, reaction);
      if (result.success) {
        // Update local messages with new reaction
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, reactions: result.data.reactions }
            : msg
        ));
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const renderMessage = ({ item, index }) => {
    const isOwnMessage = item.senderId === user.id;
    const showSender = index === 0 || messages[index - 1].senderId !== item.senderId;
    const showTime = index === messages.length - 1 || 
                   messages[index + 1].senderId !== item.senderId ||
                   (new Date(messages[index + 1].timestamp) - new Date(item.timestamp)) > 300000; // 5 minutes

    const reactions = item.reactions || {};
    const hasReactions = Object.keys(reactions).length > 0;

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        {showSender && !isOwnMessage && (
          <View style={styles.senderNameContainer}>
            <Text style={styles.senderName}>{item.senderName}</Text>
            {item.isAnonymous && (
              <Ionicons name="shield-checkmark" size={12} color={theme.colors.primary[500]} style={styles.anonymousIcon} />
            )}
          </View>
        )}
        
        <TouchableOpacity
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
          ]}
          onLongPress={() => showReactionMenu(item)}
        >
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          
          {hasReactions && (
            <View style={styles.reactionsContainer}>
              {Object.entries(reactions).map(([reaction, users]) => (
                <TouchableOpacity
                  key={reaction}
                  style={[
                    styles.reactionBadge,
                    users.includes(user.id) && styles.userReactionBadge
                  ]}
                  onPress={() => handleReaction(item.id, reaction)}
                >
                  <Text style={styles.reactionEmoji}>{getReactionEmoji(reaction)}</Text>
                  <Text style={styles.reactionCount}>{users.length}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {showTime && (
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {chatService.formatTime(item.timestamp)}
          </Text>
        )}
      </View>
    );
  };

  const getReactionEmoji = (reaction) => {
    const reactionMap = {
      'like': '👍',
      'love': '❤️',
      'laugh': '😂',
      'support': '🤗',
      'care': '💙'
    };
    return reactionMap[reaction] || '👍';
  };

  const showReactionMenu = (message) => {
    const reactions = ['like', 'love', 'laugh', 'support', 'care'];
    
    Alert.alert(
      'React to message',
      message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
      [
        ...reactions.map(reaction => ({
          text: `${getReactionEmoji(reaction)} ${reaction}`,
          onPress: () => handleReaction(message.id, reaction)
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const showRoomMenu = () => {
    Alert.alert(
      'Room Options',
      `Options for ${room.name}`,
      [
        {
          text: 'View Members',
          onPress: () => Alert.alert('Members', `${room.memberCount || 0} members in this room`)
        },
        {
          text: 'Room Info',
          onPress: () => Alert.alert('Room Info', room.description || 'No description available')
        },
        {
          text: 'Report Issue',
          onPress: () => Alert.alert('Report', 'Thank you for helping keep our community safe. Your report has been submitted.')
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
      </TouchableOpacity>
      
      <View style={styles.roomInfo}>
        <Text style={styles.roomName}>{room.name}</Text>
        <Text style={styles.roomDescription}>
          {room.description || `${room.memberCount || 0} members`}
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.menuButton}
        onPress={() => showRoomMenu()}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.gray[400]} />
      <Text style={styles.emptyStateTitle}>Start the conversation</Text>
      <Text style={styles.emptyStateText}>
        Be the first to share something with the {room.name} community
      </Text>
    </View>
  );

  if (loading) {
    return <LoadingSpinner text="Loading messages..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          ListEmptyComponent={renderEmptyState}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <View style={styles.typingIndicator}>
            <View style={styles.typingDots}>
              <View style={[styles.typingDot, styles.typingDot1]} />
              <View style={[styles.typingDot, styles.typingDot2]} />
              <View style={[styles.typingDot, styles.typingDot3]} />
            </View>
            <Text style={styles.typingText}>
              {typingUsers.length === 1 
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.length} people are typing...`
              }
            </Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={handleTyping}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <LoadingSpinner size="small" color="white" />
            ) : (
              <Ionicons 
                name="send" 
                size={20} 
                color={newMessage.trim() ? 'white' : theme.colors.gray[400]} 
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Anonymous Mode Notice */}
        {isAnonymous && (
          <View style={styles.anonymousNotice}>
            <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary[600]} />
            <Text style={styles.anonymousNoticeText}>
              You're chatting anonymously
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  roomDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  messagesContent: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: 16,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  senderNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 12,
  },
  senderName: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  anonymousIcon: {
    marginLeft: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ownMessageBubble: {
    backgroundColor: theme.colors.primary[500],
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: theme.colors.text.primary,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 12,
  },
  ownMessageTime: {
    color: theme.colors.gray[500],
    textAlign: 'right',
  },
  otherMessageTime: {
    color: theme.colors.gray[500],
    textAlign: 'left',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: theme.colors.gray[50],
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.gray[300],
  },
  anonymousNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.primary[50],
  },
  anonymousNoticeText: {
    fontSize: 12,
    color: theme.colors.primary[600],
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  userReactionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  reactionEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.gray[50],
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.gray[400],
    marginHorizontal: 1,
  },
  typingDot1: {
    animationDelay: '0s',
  },
  typingDot2: {
    animationDelay: '0.2s',
  },
  typingDot3: {
    animationDelay: '0.4s',
  },
  typingText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
});