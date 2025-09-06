import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const ContentPreview = ({ content, onShare, onEdit }) => {
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');

  if (!content) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-outline" size={48} color="#CCCCCC" />
        <Text style={styles.emptyText}>No content to preview</Text>
      </View>
    );
  }

  const platforms = [
    { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
    { key: 'tiktok', label: 'TikTok', icon: 'musical-notes-outline', color: '#000000' },
    { key: 'x', label: 'X', icon: 'logo-twitter', color: '#1DA1F2' },
    { key: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: '#1877F2' }
  ];

  const handleShare = (platform) => {
    if (!content.platforms.includes(platform)) {
      Alert.alert('Platform Not Selected', 'This content was not generated for this platform.');
      return;
    }
    onShare(content, platform);
  };

  const renderInstagramPreview = () => {
    const igContent = content.platformContent.instagram;
    if (!igContent) return null;

    return (
      <View style={styles.previewContainer}>
        {/* Instagram Story Preview */}
        <View style={styles.instagramStory}>
          <LinearGradient
            colors={[igContent.story.backgroundColor || '#87CEEB', '#FFFFFF']}
            style={styles.storyGradient}
          >
            <View style={styles.storyHeader}>
              <View style={styles.storyProfile}>
                <View style={styles.storyAvatar} />
                <Text style={styles.storyUsername}>
                  {content.isAnonymous ? 'Anonymous User' : 'You'}
                </Text>
              </View>
              <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
            </View>
            
            <View style={styles.storyContent}>
              <Text style={styles.storyText}>{igContent.story.text}</Text>
              {igContent.story.stickers && (
                <Text style={styles.storyEmoji}>{igContent.story.stickers[0]}</Text>
              )}
            </View>
            
            <View style={styles.storyFooter}>
              <Text style={styles.storyHashtags}>{igContent.story.hashtags}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Instagram Post Preview */}
        <View style={styles.instagramPost}>
          <View style={styles.postHeader}>
            <View style={styles.postProfile}>
              <View style={styles.postAvatar} />
              <Text style={styles.postUsername}>
                {content.isAnonymous ? 'Anonymous User' : 'your_username'}
              </Text>
            </View>
            <Ionicons name="ellipsis-horizontal" size={20} color="#000000" />
          </View>
          
          <View style={styles.postImage}>
            <Text style={styles.postImagePlaceholder}>Generated Image</Text>
          </View>
          
          <View style={styles.postActions}>
            <View style={styles.postActionButtons}>
              <Ionicons name="heart-outline" size={24} color="#000000" />
              <Ionicons name="chatbubble-outline" size={24} color="#000000" />
              <Ionicons name="paper-plane-outline" size={24} color="#000000" />
            </View>
            <Ionicons name="bookmark-outline" size={24} color="#000000" />
          </View>
          
          <Text style={styles.postCaption}>{igContent.post.caption}</Text>
        </View>
      </View>
    );
  };

  const renderTikTokPreview = () => {
    const tiktokContent = content.platformContent.tiktok;
    if (!tiktokContent) return null;

    return (
      <View style={styles.tiktokContainer}>
        <View style={styles.tiktokVideo}>
          <Text style={styles.tiktokPlaceholder}>Video Preview</Text>
          <Text style={styles.tiktokScript}>{tiktokContent.videoScript}</Text>
        </View>
        
        <View style={styles.tiktokSidebar}>
          <View style={styles.tiktokProfile}>
            <View style={styles.tiktokAvatar} />
            <Ionicons name="add" size={16} color="#FFFFFF" style={styles.tiktokFollow} />
          </View>
          
          <View style={styles.tiktokActions}>
            <Ionicons name="heart" size={32} color="#FFFFFF" />
            <Text style={styles.tiktokActionText}>12.3K</Text>
            
            <Ionicons name="chatbubble" size={32} color="#FFFFFF" />
            <Text style={styles.tiktokActionText}>1,234</Text>
            
            <Ionicons name="arrow-redo" size={32} color="#FFFFFF" />
            <Text style={styles.tiktokActionText}>567</Text>
          </View>
        </View>
        
        <View style={styles.tiktokBottom}>
          <Text style={styles.tiktokUsername}>
            @{content.isAnonymous ? 'anonymous_user' : 'your_username'}
          </Text>
          <Text style={styles.tiktokDescription}>{tiktokContent.description}</Text>
        </View>
      </View>
    );
  };

  const renderXPreview = () => {
    const xContent = content.platformContent.x;
    if (!xContent) return null;

    return (
      <View style={styles.xContainer}>
        <View style={styles.xTweet}>
          <View style={styles.xHeader}>
            <View style={styles.xProfile}>
              <View style={styles.xAvatar} />
              <View>
                <Text style={styles.xDisplayName}>
                  {content.isAnonymous ? 'Anonymous User' : 'Your Name'}
                </Text>
                <Text style={styles.xUsername}>
                  @{content.isAnonymous ? 'anonymous_user' : 'your_username'} · 2m
                </Text>
              </View>
            </View>
            <Ionicons name="ellipsis-horizontal" size={20} color="#536471" />
          </View>
          
          <Text style={styles.xText}>{xContent.text}</Text>
          
          <View style={styles.xActions}>
            <View style={styles.xAction}>
              <Ionicons name="chatbubble-outline" size={18} color="#536471" />
              <Text style={styles.xActionText}>12</Text>
            </View>
            <View style={styles.xAction}>
              <Ionicons name="repeat-outline" size={18} color="#536471" />
              <Text style={styles.xActionText}>34</Text>
            </View>
            <View style={styles.xAction}>
              <Ionicons name="heart-outline" size={18} color="#536471" />
              <Text style={styles.xActionText}>156</Text>
            </View>
            <View style={styles.xAction}>
              <Ionicons name="share-outline" size={18} color="#536471" />
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFacebookPreview = () => {
    const fbContent = content.platformContent.facebook;
    if (!fbContent) return null;

    return (
      <View style={styles.facebookContainer}>
        <View style={styles.facebookPost}>
          <View style={styles.facebookHeader}>
            <View style={styles.facebookProfile}>
              <View style={styles.facebookAvatar} />
              <View>
                <Text style={styles.facebookName}>
                  {content.isAnonymous ? 'Anonymous User' : 'Your Name'}
                </Text>
                <Text style={styles.facebookTime}>2 minutes ago · 🌍</Text>
              </View>
            </View>
            <Ionicons name="ellipsis-horizontal" size={20} color="#65676B" />
          </View>
          
          <Text style={styles.facebookText}>{fbContent.message}</Text>
          
          <View style={styles.facebookStats}>
            <Text style={styles.facebookLikes}>👍❤️😊 You and 23 others</Text>
            <Text style={styles.facebookComments}>5 comments</Text>
          </View>
          
          <View style={styles.facebookActions}>
            <TouchableOpacity style={styles.facebookAction}>
              <Ionicons name="thumbs-up-outline" size={20} color="#65676B" />
              <Text style={styles.facebookActionText}>Like</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.facebookAction}>
              <Ionicons name="chatbubble-outline" size={20} color="#65676B" />
              <Text style={styles.facebookActionText}>Comment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.facebookAction}>
              <Ionicons name="share-outline" size={20} color="#65676B" />
              <Text style={styles.facebookActionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderPreview = () => {
    switch (selectedPlatform) {
      case 'instagram':
        return renderInstagramPreview();
      case 'tiktok':
        return renderTikTokPreview();
      case 'x':
        return renderXPreview();
      case 'facebook':
        return renderFacebookPreview();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Content Preview</Text>
        <TouchableOpacity onPress={onEdit} style={styles.editButton}>
          <Ionicons name="create-outline" size={20} color="#007AFF" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Platform Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.platformSelector}>
        {platforms.map(platform => (
          <TouchableOpacity
            key={platform.key}
            style={[
              styles.platformTab,
              selectedPlatform === platform.key && styles.platformTabActive,
              !content.platforms.includes(platform.key) && styles.platformTabDisabled
            ]}
            onPress={() => setSelectedPlatform(platform.key)}
            disabled={!content.platforms.includes(platform.key)}
          >
            <Ionicons
              name={platform.icon}
              size={20}
              color={
                !content.platforms.includes(platform.key) ? '#CCCCCC' :
                selectedPlatform === platform.key ? '#FFFFFF' : platform.color
              }
            />
            <Text style={[
              styles.platformTabText,
              selectedPlatform === platform.key && styles.platformTabTextActive,
              !content.platforms.includes(platform.key) && styles.platformTabTextDisabled
            ]}>
              {platform.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Preview Content */}
      <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
        {renderPreview()}
      </ScrollView>

      {/* Share Button */}
      <TouchableOpacity
        style={[
          styles.shareButton,
          !content.platforms.includes(selectedPlatform) && styles.shareButtonDisabled
        ]}
        onPress={() => handleShare(selectedPlatform)}
        disabled={!content.platforms.includes(selectedPlatform)}
      >
        <Ionicons name="share-outline" size={20} color="#FFFFFF" />
        <Text style={styles.shareButtonText}>
          Share to {platforms.find(p => p.key === selectedPlatform)?.label}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  editButtonText: {
    marginLeft: 4,
    color: '#007AFF',
    fontSize: 16
  },
  platformSelector: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  platformTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4
  },
  platformTabActive: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    marginVertical: 8
  },
  platformTabDisabled: {
    opacity: 0.5
  },
  platformTabText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666666'
  },
  platformTabTextActive: {
    color: '#FFFFFF'
  },
  platformTabTextDisabled: {
    color: '#CCCCCC'
  },
  previewScroll: {
    flex: 1,
    padding: 16
  },
  previewContainer: {
    gap: 20
  },
  // Instagram Styles
  instagramStory: {
    width: width * 0.6,
    height: width * 1.2,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center'
  },
  storyGradient: {
    flex: 1,
    padding: 16
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  storyProfile: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  storyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginRight: 8
  },
  storyUsername: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  storyText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20
  },
  storyEmoji: {
    fontSize: 48
  },
  storyFooter: {
    alignItems: 'center'
  },
  storyHashtags: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center'
  },
  instagramPost: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden'
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12
  },
  postProfile: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    marginRight: 12
  },
  postUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000'
  },
  postImage: {
    height: 200,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  postImagePlaceholder: {
    color: '#666666',
    fontSize: 16
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12
  },
  postActionButtons: {
    flexDirection: 'row',
    gap: 16
  },
  postCaption: {
    padding: 12,
    paddingTop: 0,
    fontSize: 14,
    color: '#000000'
  },
  // TikTok Styles
  tiktokContainer: {
    width: width * 0.6,
    height: width * 1.2,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
    position: 'relative'
  },
  tiktokVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  tiktokPlaceholder: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 20
  },
  tiktokScript: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center'
  },
  tiktokSidebar: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    alignItems: 'center'
  },
  tiktokProfile: {
    alignItems: 'center',
    marginBottom: 20
  },
  tiktokAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF'
  },
  tiktokFollow: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#FF0050',
    borderRadius: 8,
    padding: 2
  },
  tiktokActions: {
    alignItems: 'center',
    gap: 20
  },
  tiktokActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4
  },
  tiktokBottom: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 60
  },
  tiktokUsername: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  tiktokDescription: {
    color: '#FFFFFF',
    fontSize: 14
  },
  // X (Twitter) Styles
  xContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden'
  },
  xTweet: {
    padding: 16
  },
  xHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  xProfile: {
    flexDirection: 'row',
    flex: 1
  },
  xAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 12
  },
  xDisplayName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1419'
  },
  xUsername: {
    fontSize: 15,
    color: '#536471'
  },
  xText: {
    fontSize: 15,
    color: '#0F1419',
    lineHeight: 20,
    marginBottom: 12
  },
  xActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 300
  },
  xAction: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  xActionText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#536471'
  },
  // Facebook Styles
  facebookContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden'
  },
  facebookPost: {
    padding: 16
  },
  facebookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  facebookProfile: {
    flexDirection: 'row',
    flex: 1
  },
  facebookAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 12
  },
  facebookName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1E21'
  },
  facebookTime: {
    fontSize: 13,
    color: '#65676B'
  },
  facebookText: {
    fontSize: 15,
    color: '#1C1E21',
    lineHeight: 20,
    marginBottom: 12
  },
  facebookStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E6EA',
    marginBottom: 8
  },
  facebookLikes: {
    fontSize: 13,
    color: '#65676B'
  },
  facebookComments: {
    fontSize: 13,
    color: '#65676B'
  },
  facebookActions: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  facebookAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  facebookActionText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#65676B',
    fontWeight: '600'
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center'
  },
  // Share Button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 12
  },
  shareButtonDisabled: {
    backgroundColor: '#CCCCCC'
  },
  shareButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  }
});

export default ContentPreview;