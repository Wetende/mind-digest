import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BreathingExercise } from '../components';

export default function ToolkitScreen() {
  const [selectedTool, setSelectedTool] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [breathingVisible, setBreathingVisible] = useState(false);

  const toolkitItems = [
    {
      id: 1,
      title: 'Conversation Starters',
      subtitle: 'Break the ice with confidence',
      icon: 'chatbubbles',
      color: ['#60a5fa', '#3b82f6'],
      content: [
        "What's been the highlight of your week so far?",
        "Have you watched anything interesting lately?",
        "What's your favorite way to unwind after work?",
        "Any fun plans for the weekend?",
        "What's something you've learned recently?",
        "Have you tried any new restaurants lately?",
        "What's your go-to comfort food?",
        "Any book or podcast recommendations?",
      ],
    },
    {
      id: 2,
      title: 'Breathing Exercises',
      subtitle: 'Quick anxiety relief',
      icon: 'leaf',
      color: ['#34d399', '#10b981'],
      isBreathing: true,
      content: [
        "4-7-8 Breathing: Inhale for 4, hold for 7, exhale for 8",
        "Box Breathing: Inhale 4, hold 4, exhale 4, hold 4",
        "5-5 Breathing: Inhale for 5, exhale for 5",
        "Belly Breathing: Focus on expanding your diaphragm",
        "Progressive Relaxation: Tense and release muscle groups",
      ],
    },
    {
      id: 3,
      title: 'Social Scenarios',
      subtitle: 'Practice common situations',
      icon: 'people',
      color: ['#fbbf24', '#f59e0b'],
      content: [
        "Scenario: Meeting new people at a party",
        "Scenario: Making small talk with coworkers",
        "Scenario: Asking for help or directions",
        "Scenario: Handling disagreements calmly",
        "Scenario: Joining an ongoing conversation",
        "Scenario: Declining invitations politely",
      ],
    },
    {
      id: 4,
      title: 'Confidence Boosters',
      subtitle: 'Build self-assurance',
      icon: 'star',
      color: ['#f472b6', '#ec4899'],
      content: [
        "Remember: Everyone feels awkward sometimes",
        "Focus on being curious about others",
        "Your opinion matters and is valid",
        "It's okay to take pauses in conversation",
        "Most people are understanding and kind",
        "You don't need to be perfect",
        "Small talk leads to meaningful connections",
      ],
    },
    {
      id: 5,
      title: 'Emergency Calm',
      subtitle: 'Instant anxiety relief',
      icon: 'medical',
      color: ['#ef4444', '#dc2626'],
      content: [
        "5-4-3-2-1 Grounding: 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste",
        "Cold water on wrists or face",
        "Step outside for fresh air",
        "Text a trusted friend",
        "Listen to calming music",
        "Use a calming app or meditation",
        "Remember: This feeling will pass",
      ],
    },
  ];

  const openTool = (tool) => {
    if (tool.isBreathing) {
      setBreathingVisible(true);
    } else {
      setSelectedTool(tool);
      setModalVisible(true);
    }
  };

  const closeTool = () => {
    setModalVisible(false);
    setSelectedTool(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.headerText}>Your Social Ease Toolkit</Text>
        <Text style={styles.subHeaderText}>
          Practical tools to help you navigate social situations with confidence
        </Text>

        <View style={styles.toolsGrid}>
          {toolkitItems.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={styles.toolCard}
              onPress={() => openTool(tool)}
            >
              <LinearGradient
                colors={tool.color}
                style={styles.toolGradient}
              >
                <Ionicons name={tool.icon} size={32} color="white" />
                <Text style={styles.toolTitle}>{tool.title}</Text>
                <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Tool Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeTool}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTool && (
              <>
                <View style={styles.modalHeader}>
                  <Ionicons name={selectedTool.icon} size={40} color="#6366f1" />
                  <Text style={styles.modalTitle}>{selectedTool.title}</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={closeTool}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalBody}>
                  {selectedTool.content.map((item, index) => (
                    <View key={index} style={styles.contentItem}>
                      <Text style={styles.contentText}>{item}</Text>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => {
                    Alert.alert('Share', 'Social sharing feature coming soon!');
                  }}
                >
                  <Text style={styles.shareButtonText}>Share Progress</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Breathing Exercise Modal */}
      <BreathingExercise
        visible={breathingVisible}
        onClose={() => setBreathingVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  toolsGrid: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  toolCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  toolGradient: {
    padding: 20,
    alignItems: 'center',
  },

  toolTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  toolSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
  },
  contentItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  contentText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  shareButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});