import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import PeerCompatibilityCard from './PeerCompatibilityCard';
import recommendationEngine from '../services/recommendationEngine';
import behaviorLearningService from '../services/behaviorLearningService';
import matchingService