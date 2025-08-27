import React, { useState } from 'react';
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
import { validateEmail, validatePassword, getPasswordStrength } from '../../utils';
import { theme } from '../../theme';

export default function SignUpScreen({ navigation }) {
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

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

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await signUp(
        formData.email,
        formData.password,
        {
          display_name: formData.displayName,
          is_anonymous: false,
        }
      );

      if (result.success) {
        Alert.alert(
          'Welcome to Mind-digest!',
          'Your account has been created successfully. You can now start your wellness journey.',
          [
            {
              text: 'Get Started',
              onPress: () => {
                // The AuthContext will automatically navigate to MainApp
                // since the user is now authenticated
              },
            },
          ]
        );
      } else {
        Alert.alert('Sign Up Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  if (loading) {
    return <LoadingSpinner text="Creating your account..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join the Mind-digest community and start your wellness journey
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Display Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
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

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
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

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.passwordInput, errors.password && styles.inputError]}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeButtonText}>
                    <Ionicons 
                      name={showPassword ? 'eye-off' : 'eye'} 
                      size={20} 
                      color="#6b7280" 
                    />
                  </Text>
                </TouchableOpacity>
              </View>
              {formData.password.length > 0 && (
                <View style={styles.passwordStrength}>
                  <Text style={[
                    styles.strengthText,
                    { color: passwordStrength.level === 'strong' ? '#10b981' : 
                             passwordStrength.level === 'medium' ? '#f59e0b' : '#ef4444' }
                  ]}>
                    Password strength: {passwordStrength.level}
                  </Text>
                </View>
              )}
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>
          </View>

          {/* Terms */}
          <View style={styles.termsSection}>
            <Text style={styles.termsText}>
              By creating an account, you agree to our{' '}
              <Text style={styles.linkText}>Terms of Service</Text> and{' '}
              <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
          </View>

          {/* Sign Up Button */}
          <Button
            title="Create Account"
            onPress={handleSignUp}
            variant="primary"
            size="large"
            style={styles.signUpButton}
          />

          {/* Sign In Link */}
          <TouchableOpacity
            style={styles.signInLink}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Text style={styles.signInText}>
              Already have an account? <Text style={styles.linkText}>Sign In</Text>
            </Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
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
    lineHeight: 22,
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
  inputError: {
    borderColor: theme.colors.danger[500],
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  eyeButtonText: {
    fontSize: 18,
  },
  passwordStrength: {
    marginTop: 4,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.danger[500],
    marginTop: 4,
  },
  termsSection: {
    marginBottom: 24,
  },
  termsText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  linkText: {
    color: theme.colors.primary[500],
    fontWeight: '500',
  },
  signUpButton: {
    marginBottom: 24,
  },
  signInLink: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  signInText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
});