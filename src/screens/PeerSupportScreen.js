import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { chatService } from '../services';
import { LoadingSpinner } from '../components';
import { theme } from '../theme';

export default function PeerSupportScreen({ navigation }) {
  const { user, isAnonymous } = useAuth();
  const [activeTab, setActiveTab] = useState('rooms');
  const [message, setMessage] = useState('');
  const [supportRooms, setSupportRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadChatRooms();
  }, []);

  const loadChatRooms = async () => {
    try {
      const result = await chatService.getChatRooms();
      if (result.success) {
        setSupportRooms(result.data);
      } else {
        Alert.alert('Error', 'Failed to load chat rooms');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong loading chat rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChatRooms();
    setRefreshing(false);
  };

  const joinRoom = async (room) => {
    try {
      const result = await chatService.joinRoom(room.id, user.id);
      if (result.success) {
        navigation.navigate('ChatRoom', { room });
      } else {
        Alert.alert('Error', 'Failed to join room');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong joining the room');
    }
  };

  const recentMessages = [
    {
      id: 1,
      user: 'Anonymous User',
      message: 'Had my first panic-free presentation today!',
      time: '5m ago',
      likes: 12,
    },
    {
      id: 2,
      user: 'Mindful Mike',
      message: 'Remember: progress, not perfection! 💪',
      time: '10m ago',
      likes: 8,
    },
    {
      id: 3,
      user: 'Calm Coder',
      message: 'Tried the 4-7-8 breathing technique today. Really helped!',
      time: '25m ago',
      likes: 15,
    },
  ];
  
const renderSupportRooms = () => {
    if (loading) {
      return <LoadingSpinner text="Loading chat rooms..." />;
    }

    return (
      <View style={styles.tabContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Support Communities</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Ionicons name="refresh" size={20} color={theme.colors.primary[500]} />
          </TouchableOpacity>
        </View>
        
        {supportRooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.gray[400]} />
            <Text style={styles.emptyStateText}>No chat rooms available</Text>
          </View>
        ) : (
          supportRooms.map((room) => (
            <TouchableOpacity 
              key={room.id} 
              style={styles.roomCard}
              onPress={() => joinRoom(room)}
            >
              <View style={styles.roomHeader}>
                <View style={styles.roomInfo}>
                  <Text style={styles.roomName}>{room.name}</Text>
                  <Text style={styles.roomDescription}>{room.description}</Text>
                </View>
                <View style={styles.roomMeta}>
                  <Text style={styles.memberCount}>
                    {room.memberCount || 0} members
                  </Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{room.category}</Text>
                  </View>
                </View>
              </View>
              
              {room.lastMessage && (
                <View style={styles.lastMessageContainer}>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {room.lastMessage.sender}: {room.lastMessage.content}
                  </Text>
                  <Text style={styles.timeStamp}>{room.lastMessage.time}</Text>
                </View>
              )}
              
              <View style={styles.roomFooter}>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.gray[400]} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  const renderRecentMessages = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Recent Messages</Text>
      {recentMessages.map((msg) => (
        <View key={msg.id} style={styles.messageCard}>
          <View style={styles.messageHeader}>
            <Text style={styles.userName}>{msg.user}</Text>
            <Text style={styles.timeStamp}>{msg.time}</Text>
          </View>
          <Text style={styles.messageText}>{msg.message}</Text>
          <View style={styles.messageFooter}>
            <TouchableOpacity style={styles.likeButton}>
              <View style={styles.likeContainer}>
                <Ionicons name="heart" size={14} color="#ef4444" />
                <Text style={styles.likeText}>{msg.likes}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderMessageComposer = () => (
    <View style={styles.messageComposer}>
      <TextInput
        style={styles.messageInput}
        placeholder="Share your thoughts or ask for support..."
        value={message}
        onChangeText={setMessage}
        multiline
      />
      <TouchableOpacity 
        style={styles.sendButton}
        onPress={() => {
          if (message.trim()) {
            Alert.alert('Message Sent', 'Your message has been shared with the community.');
            setMessage('');
          }
        }}
      >
        <Text style={styles.sendButtonText}>Send</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Peer Support</Text>
        <Text style={styles.subtitle}>Connect with others on similar journeys</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rooms' && styles.activeTab]}
          onPress={() => setActiveTab('rooms')}
        >
          <Text style={[styles.tabText, activeTab === 'rooms' && styles.activeTabText]}>
            Communities
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            Recent Posts
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'rooms' ? renderSupportRooms() : renderRecentMessages()}
      </ScrollView>

      {renderMessageComposer()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007bff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  refreshButton: {
    padding: 8,
  },
  roomCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roomInfo: {
    flex: 1,
    marginRight: 12,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  roomDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
  },
  roomMeta: {
    alignItems: 'flex-end',
  },
  memberCount: {
    fontSize: 14,
    color: '#6c757d',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lastMessage: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  timeStamp: {
    fontSize: 12,
    color: '#6c757d',
  },
  messageCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  messageText: {
    fontSize: 15,
    color: '#495057',
    lineHeight: 22,
    marginBottom: 12,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  likeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeText: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 4,
  },
  messageComposer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  categoryBadge: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  lastMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomFooter: {
    alignItems: 'flex-end',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 12,
    textAlign: 'center',
  },
});