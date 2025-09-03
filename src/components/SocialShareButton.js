import React, { useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import SocialShareModal from './SocialShareModal';

/**
 * Social Share Button Component
 * Provides a button to trigger social sharing with platform selection
 */

const SocialShareButton = ({
  data,
  templateType = 'mood',
  anonymous = true,
  style,
  size = 'medium',
  showText = true,
  userPreferences = { anonymousOnly: false }
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleShare = async () => {
    if (isLoading) return;

    // Check if we have enough data to share
    const hasValidData = data && (
      data.mood !== undefined ||
      data.achievement ||
      data.items ||
      (data.activity || data.meditation || data.exercise || data.social)
    );

    if (!hasValidData) {
      Alert.alert(
        'Sharing Unavailable',
        'Please add some content before sharing. This helps ensure meaningful interactions in your mental health journey.',
        [{ text: 'OK' }]
      );
      return;
    }

    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  const getButtonSize = () => {
    const sizes = {
      small: { padding: 8, iconSize: 16 },
      medium: { padding: 12, iconSize: 20 },
      large: { padding: 16, iconSize: 24 }
    };
    return sizes[size] || sizes.medium;
  };

  const { padding, iconSize } = getButtonSize();

  const buttonStyles = StyleSheet.create({
    container: {
      backgroundColor: '#4A90E2',
      borderRadius: 8,
      paddingHorizontal: padding,
      paddingVertical: padding / 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: size === 'small' ? 80 : 120,
      ...style
    },
    text: {
      color: 'white',
      fontWeight: '600',
      marginLeft: showText ? 8 : 0,
      fontSize: size === 'small' ? 12 : size === 'large' ? 16 : 14
    },
    icon: {
      color: 'white'
    }
  });

  return (
    <>
      <TouchableOpacity
        style={buttonStyles.container}
        onPress={handleShare}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <Ionicons
          name="share-social"
          size={iconSize}
          style={buttonStyles.icon}
        />
        {showText && (
          <Text style={buttonStyles.text}>
            Share {anonymous ? 'Anonymously' : 'Your Story'}
          </Text>
        )}
      </TouchableOpacity>

      <SocialShareModal
        visible={modalVisible}
        onClose={handleModalClose}
        data={data}
        templateType={templateType}
        anonymous={anonymous}
        userPreferences={userPreferences}
        onSharingStart={() => setIsLoading(true)}
        onSharingEnd={() => setIsLoading(false)}
      />
    </>
  );
};

export default SocialShareButton;
