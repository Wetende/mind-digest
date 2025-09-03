import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Card } from './Card';
import { socialSharingService } from '../services';

/**
 * Social Share Modal Component
 * Modal for selecting social platforms and sharing content
 */

const SocialShareModal = ({
  visible,
  onClose,
  data,
  templateType = 'mood',
  anonymous = true,
  userPreferences = { anonymousOnly: false },
  onSharingStart,
  onSharingEnd
}) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [sharingResults, setSharingResults] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [platformAvailability, setPlatformAvailability] = useState({});
  const [contentPreview, setContentPreview] = useState(null);

  const platforms = [
    {
      id: 'instagram',
      name: 'Instagram Stories',
      icon: 'logo-instagram',
      color: '#E4405F',
      description: 'Share as a beautiful story'
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: 'logo-tiktok',
      color: '#000000',
      description: 'Create engaging short content'
    },
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: 'logo-twitter',
      color: '#1DA1F2',
      description: 'Share your thoughts'
    }
  ];

  useEffect(() => {
    if (visible && data) {
      loadPlatformAvailability();
      generatePreview();
    }
  }, [visible, data, templateType, anonymous]);

  const loadPlatformAvailability = async () => {
    const availability = {};
    for (const platform of platforms) {
      availability[platform.id] = await socialSharingService.checkPlatformAvailability(platform.id);
    }
    setPlatformAvailability(availability);

    // Auto-select recommended platforms
    const recommendations = socialSharingService.getSharingRecommendations(templateType, userPreferences);
    setSelectedPlatforms(recommendations);
  };

  const generatePreview = () => {
    if (!data) return;

    try {
      const content = socialSharingService.generateAnonymizedContent(data, templateType, anonymous);
      setContentPreview(content);
    } catch (error) {
      console.error('Error generating preview:', error);
    }
  };

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleShare = async () => {
    if (selectedPlatforms.length === 0) {
      Alert.alert('No Platforms Selected', 'Please select at least one platform to share to.');
      return;
    }

    setIsSharing(true);
    onSharingStart?.();

    try {
      const results = await socialSharingService.shareToMultiple(
        selectedPlatforms,
        data,
        {
          template: templateType,
          anonymous,
          userPreferences
        }
      );

      setSharingResults(results);

      const successful = results.filter(r => r.success && r.shared);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        Alert.alert(
          'Sharing Successful!',
          `Successfully shared to ${successful.length} platform${successful.length > 1 ? 's' : ''}.${
            failed.length > 0 ? `\n\nFailed to share to ${failed.length} platform${failed.length > 1 ? 's' : ''}.` : ''
          }`,
          [
            {
              text: 'Close',
              onPress: () => {
                setSharingResults(null);
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Sharing Failed',
          'Unable to share to any selected platforms. Please check your settings and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert(
        'Sharing Error',
        'An unexpected error occurred while sharing. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSharing(false);
      onSharingEnd?.();
    }
  };

  const getPlatformPreview = (platformId) => {
    if (!contentPreview || !contentPreview[platformId]) return null;

    const content = contentPreview[platformId];
    const maxPreviewLength = platformId === 'twitter' ? 100 : 80;

    return content.text.length > maxPreviewLength
      ? content.text.substring(0, maxPreviewLength) + '...'
      : content.text;
  };

  const renderPlatformOption = (platform) => {
    const isSelected = selectedPlatforms.includes(platform.id);
    const isAvailable = platformAvailability[platform.id];
    const preview = getPlatformPreview(platform.id);

    return (
      <TouchableOpacity
        key={platform.id}
        onPress={() => togglePlatform(platform.id)}
        disabled={!isAvailable || isSharing}
        activeOpacity={0.7}
        style={[
          styles.platformOption,
          isSelected && styles.platformOptionSelected,
          (!isAvailable || isSharing) && styles.platformOptionDisabled
        ]}
      >
        <View style={styles.platformHeader}>
          <View style={styles.platformIcon}>
            <Ionicons name={platform.icon} size={24} color={platform.color} />
          </View>
          <View style={styles.platformInfo}>
            <Text style={[styles.platformName, !isAvailable && styles.platformTextDisabled]}>
              {platform.name}
              {!isAvailable && ' (App not available)'}
            </Text>
            <Text style={[styles.platformDescription, !isAvailable && styles.platformTextDisabled]}>
              {platform.description}
            </Text>
          </View>
          <View style={styles.selectIndicator}>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
            )}
          </View>
        </View>

        {isSelected && preview && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Preview:</Text>
            <Text style={styles.previewText}>{preview}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Share Your {templateType}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              Choose where you'd like to share {anonymous ? 'anonymously' : 'your experience'}.
              This helps build awareness and connect with others on their mental health journey.
            </Text>

            <View style={styles.platformsList}>
              {platforms.map(renderPlatformOption)}
            </View>

            {selectedPlatforms.length > 0 && contentPreview && (
              <Card style={styles.privacyNote}>
                <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                <View style={styles.privacyText}>
                  <Text style={styles.privacyTitle}>Privacy & Safety</Text>
                  <Text style={styles.privacyDescription}>
                    {anonymous
                      ? 'Your content will be anonymized to protect your privacy.'
                      : 'Your name and specific details will be shared. Check preview above.'
                    }
                  </Text>
                </View>
              </Card>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={isSharing ? "Sharing..." : `Share to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? 's' : ''}`}
              onPress={handleShare}
              disabled={selectedPlatforms.length === 0 || isSharing}
              style={styles.shareButton}
              color={selectedPlatforms.length === 0 ? '#ccc' : '#4A90E2'}
            />

            {isSharing && (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color="#4A90E2" />
                <Text style={styles.loadingText}>Opening social platforms...</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  platformsList: {
    marginBottom: 20,
  },
  platformOption: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    backgroundColor: 'white',
  },
  platformOptionSelected: {
    borderColor: '#4A90E2',
    borderWidth: 2,
    backgroundColor: '#f8f9ff',
  },
  platformOptionDisabled: {
    opacity: 0.6,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  platformInfo: {
    flex: 1,
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  platformTextDisabled: {
    color: '#ccc',
  },
  platformDescription: {
    fontSize: 12,
    color: '#666',
  },
  selectIndicator: {
    width: 24,
  },
  previewContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 13,
    color: '#333',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fff8',
    borderColor: '#4CAF50',
    padding: 12,
    marginBottom: 20,
  },
  privacyText: {
    marginLeft: 12,
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 2,
  },
  privacyDescription: {
    fontSize: 12,
    color: '#558B2F',
    lineHeight: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fafafa',
  },
  shareButton: {
    width: '100%',
  },
  loadingIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default SocialShareModal;
