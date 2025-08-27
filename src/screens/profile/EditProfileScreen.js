import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, LoadingSpinner } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail } from '../../utils';
import { theme } from '../../theme';

export default function EditProfileScreen({ navigation }) {
  const { user, isAnonymous, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    bio: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Initialize form with current user data
    if (user) {
      setFormData({
        displayName: user.user_metadata?.display_name || '',
        email: user.email || '',
        bio: user.user_metadata?.bio || '',
      });
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    }

    if (!isAnonymous) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!validateEmail(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (formData.bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const updates = {
        display_name: formData.displayName,
        bio: formData.bio,
      };

      // Only update email for non-anonymous users
      if (!isAnonymous && formData.email !== user.email) {
        updates.email = formData.email;
      }

      const result = await updateProfile(updates);

      if (result.success) {
        Alert.alert(
          'Profile Updated',
          'Your profile has been updated successfully.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Update Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Updating profile..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>
            Update your personal information
          </Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Picture Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <TouchableOpacity style={styles.changePhotoButton}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Display Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name *</Text>
              <TextInput
                style={[styles.input, errors.displayName && styles.inputError]}
                placeholder="How should we call you?"
                value={formData.displayName}
                onChangeText={(value) => handleInputChange('displayName', value)}
                autoCapitalize="words"
                maxLength={50}
              />
              {errors.displayName && (
                <Text style={styles.errorText}>{errors.displayName}</Text>
              )}
            </View>

            {/* Email (only for non-anonymous users) */}
            {!isAnonymous && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value.toLowerCase())}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>
            )}

            {/* Bio */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio (Optional)</Text>
              <TextInput
                style={[styles.textArea, errors.bio && styles.inputError]}
                placeholder="Tell us a bit about yourself and your wellness journey..."
                value={formData.bio}
                onChangeText={(value) => handleInputChange('bio', value)}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>
                {formData.bio.length}/500 characters
              </Text>
              {errors.bio && (
                <Text style={styles.errorText}>{errors.bio}</Text>
              )}
            </View>
          </View>

          {/* Anonymous Mode Info */}
          {isAnonymous && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>🔒 Anonymous Mode</Text>
              <Text style={styles.infoText}>
                You're using Mind-digest anonymously. Your email and some profile 
                information won't be stored on our servers.
              </Text>
            </View>
          )}

          {/* Save Button */}
          <Button
            title="Save Changes"
            onPress={handleSave}
            variant="primary"
            size="large"
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.primary[500],
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    color: theme.colors.gray[500],
  },
  changePhotoButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  changePhotoText: {
    color: theme.colors.primary[500],
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
    minHeight: 100,
  },
  inputError: {
    borderColor: theme.colors.danger[500],
  },
  characterCount: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.danger[500],
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: theme.colors.primary[50],
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary[500],
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary[700],
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.primary[600],
    lineHeight: 20,
  },
  saveButton: {
    marginBottom: 40,
  },
});