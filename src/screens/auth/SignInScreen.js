import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, LoadingSpinner } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services';
import { validateEmail } from '../../utils';
import { theme } from '../../theme';

export default function SignInScreen({ navigation }) {
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('Attempting sign in with:', formData.email);
      
      const result = await signIn(formData.email, formData.password);
      console.log('Sign in result:', result);

      if (result.success) {
        console.log('Sign in successful, navigation should happen automatically');
        // Don't show alert, just let navigation happen
        // The AuthContext will handle the navigation automatically
      } else {
        console.log('Sign in failed:', result.error);
        Alert.alert('Sign In Failed', result.error || 'Please check your email and password.');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address first.');
      return;
    }

    if (!validateEmail(formData.email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      const result = await authService.resetPassword(formData.email);
      if (result.success) {
        Alert.alert(
          'Reset Email Sent',
          'Check your email for password reset instructions.'
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Signing you in..." />;
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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue your wellness journey
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
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
                placeholder="Enter your password"
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
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Sign In Button */}
        <Button
          title="Sign In"
          onPress={handleSignIn}
          variant="primary"
          size="large"
          style={styles.signInButton}
        />

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Anonymous Option */}
        <TouchableOpacity
          style={styles.anonymousButton}
          onPress={() => navigation.navigate('AnonymousSetup')}
        >
          <Text style={styles.anonymousButtonText}>Continue Anonymously</Text>
        </TouchableOpacity>



        {/* Sign Up Link */}
        <TouchableOpacity
          style={styles.signUpLink}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.signUpText}>
            Don't have an account? <Text style={styles.linkText}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 24,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
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
    marginBottom: 32,
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
  errorText: {
    fontSize: 12,
    color: theme.colors.danger[500],
    marginTop: 4,
  },
  forgotPassword: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: theme.colors.primary[500],
    fontWeight: '500',
  },
  signInButton: {
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.gray[300],
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  anonymousButton: {
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  anonymousButtonText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  signUpLink: {
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  linkText: {
    color: theme.colors.primary[500],
    fontWeight: '500',
  },
});