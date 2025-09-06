import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ContentGenerator from '../components/ContentGenerator';
import ContentPreview from '../components/ContentPreview';
import shareableContentService from '../services/shareableContentService';
import { useAuth } from '../contexts/AuthContext';

const SocialSharingScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState('generate'); // 'generate' or 'preview'
  const [generatedContent, setGeneratedContent] = useState(null);
  const [contentHistory, setContentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadContentHistory();
  }, []);

  const loadContentHistory = async () => {
    try {
      const history = await shareableContentService.getContentHistory(user.id, 10);
      setContentHistory(history);
    } catch (error) {
      console.error('Error loading content history:', error);
    }
  };

  const handleContentGenerated = (content) => {
    setGeneratedContent(content);
    setCurrentStep('preview');
    loadContentHistory(); // Refresh history
  };

  const handleShare = async (content, platform) => {
    try {
      // In a real implementation, this would integrate with actual social platform APIs
      // For now, we'll show a success message and simulate the sharing process
      
      Alert.alert(
        'Share Content',
        `Would you like to share this content to ${platform}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Share',
            onPress: () => simulateShare(content, platform)
          }
        ]
      );
    } catch (error) {
      console.error('Error sharing content:', error);
      Alert.alert('Error', 'Failed to share content. Please try again.');
    }
  };

  const simulateShare = (content, platform) => {
    // Simulate sharing process
    setTimeout(() => {
      Alert.alert(
        'Success!',
        `Your content has been prepared for sharing to ${platform}. In a full implementation, this would open the ${platform} app or web interface.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset to generator for next content
              setCurrentStep('generate');
              setGeneratedContent(null);
            }
          }
        ]
      );
    }, 1000);
  };

  const handleEdit = () => {
    setCurrentStep('generate');
  };

  const handleNewContent = () => {
    setGeneratedContent(null);
    setCurrentStep('generate');
  };

  const renderHistoryItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.historyItem}
      onPress={() => {
        setGeneratedContent({
          id: item.id,
          type: item.content_type,
          baseContent: item.base_content,
          platformContent: item.platform_content,
          isAnonymous: item.is_anonymous,
          platforms: item.platforms,
          createdAt: item.created_at
        });
        setCurrentStep('preview');
        setShowHistory(false);
      }}
    >
      <View style={styles.historyContent}>
        <Text style={styles.historyTitle}>{item.base_content.title}</Text>
        <Text style={styles.historyText} numberOfLines={2}>
          {item.base_content.content}
        </Text>
        <View style={styles.historyMeta}>
          <Text style={styles.historyDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <View style={styles.historyPlatforms}>
            {item.platforms.map(platform => (
              <Ionicons
                key={platform}
                name={
                  platform === 'instagram' ? 'logo-instagram' :
                  platform === 'tiktok' ? 'musical-notes-outline' :
                  platform === 'x' ? 'logo-twitter' :
                  'logo-facebook'
                }
                size={16}
                color="#666666"
                style={styles.historyPlatformIcon}
              />
            ))}
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Social Sharing</Text>
        
        <TouchableOpacity onPress={() => setShowHistory(true)}>
          <Ionicons name="time-outline" size={24} color="#2C3E50" />
        </TouchableOpacity>
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        <View style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            currentStep === 'generate' && styles.stepCircleActive
          ]}>
            <Text style={[
              styles.stepNumber,
              currentStep === 'generate' && styles.stepNumberActive
            ]}>1</Text>
          </View>
          <Text style={[
            styles.stepLabel,
            currentStep === 'generate' && styles.stepLabelActive
          ]}>Create</Text>
        </View>
        
        <View style={[
          styles.stepLine,
          generatedContent && styles.stepLineActive
        ]} />
        
        <View style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            currentStep === 'preview' && styles.stepCircleActive
          ]}>
            <Text style={[
              styles.stepNumber,
              currentStep === 'preview' && styles.stepNumberActive
            ]}>2</Text>
          </View>
          <Text style={[
            styles.stepLabel,
            currentStep === 'preview' && styles.stepLabelActive
          ]}>Preview & Share</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {currentStep === 'generate' ? (
          <ContentGenerator
            userId={user.id}
            onContentGenerated={handleContentGenerated}
            initialType={generatedContent?.type || 'mood_update'}
          />
        ) : (
          <ContentPreview
            content={generatedContent}
            onShare={handleShare}
            onEdit={handleEdit}
          />
        )}
      </View>

      {/* Bottom Actions */}
      {currentStep === 'preview' && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleNewContent}
          >
            <Ionicons name="add" size={20} color="#007AFF" />
            <Text style={styles.secondaryButtonText}>New Content</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* History Modal */}
      <Modal
        visible={showHistory}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Content History</Text>
            <TouchableOpacity onPress={() => setShowHistory(false)}>
              <Ionicons name="close" size={24} color="#2C3E50" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.historyList}>
            {contentHistory.length > 0 ? (
              contentHistory.map(renderHistoryItem)
            ) : (
              <View style={styles.emptyHistory}>
                <Ionicons name="document-outline" size={48} color="#CCCCCC" />
                <Text style={styles.emptyHistoryText}>No content history yet</Text>
                <Text style={styles.emptyHistorySubtext}>
                  Create your first shareable content to see it here
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50'
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  stepContainer: {
    alignItems: 'center'
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  stepCircleActive: {
    backgroundColor: '#007AFF'
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666'
  },
  stepNumberActive: {
    color: '#FFFFFF'
  },
  stepLabel: {
    fontSize: 12,
    color: '#666666'
  },
  stepLabelActive: {
    color: '#007AFF',
    fontWeight: '600'
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20
  },
  stepLineActive: {
    backgroundColor: '#007AFF'
  },
  content: {
    flex: 1
  },
  bottomActions: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  secondaryButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF'
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50'
  },
  historyList: {
    flex: 1,
    padding: 16
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  historyContent: {
    flex: 1
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4
  },
  historyText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8
  },
  historyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  historyDate: {
    fontSize: 12,
    color: '#999999'
  },
  historyPlatforms: {
    flexDirection: 'row'
  },
  historyPlatformIcon: {
    marginLeft: 8
  },
  emptyHistory: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
    textAlign: 'center'
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center'
  }
});

export default SocialSharingScreen;