import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const scenarioTemplates = [
  {
    id: 1,
    title: 'Job Interview',
    icon: 'briefcase',
    color: ['#3b82f6', '#1d4ed8'],
    anxietyLevel: 'high',
    steps: [
      {
        phase: 'Preparation',
        tasks: [
          'Research the company and role thoroughly',
          'Prepare answers for common interview questions',
          'Choose professional attire the night before',
          'Plan your route and arrive 10-15 minutes early',
          'Bring multiple copies of your resume'
        ]
      },
      {
        phase: 'During Interview',
        tasks: [
          'Greet everyone with a firm handshake and smile',
          'Maintain good eye contact throughout',
          'Listen carefully to each question before answering',
          'Use specific examples to demonstrate your skills',
          'Ask thoughtful questions about the role and company'
        ]
      },
      {
        phase: 'Follow-up',
        tasks: [
          'Send a thank-you email within 24 hours',
          'Reiterate your interest in the position',
          'Mention something specific from the conversation',
          'Be patient while waiting for their response'
        ]
      }
    ],
    tips: [
      'Practice your answers out loud beforehand',
      'Remember that they want you to succeed',
      'It\'s okay to take a moment to think before answering',
      'Focus on your strengths and achievements'
    ]
  },
  {
    id: 2,
    title: 'First Date',
    icon: 'heart',
    color: ['#ec4899', '#be185d'],
    anxietyLevel: 'medium',
    steps: [
      {
        phase: 'Planning',
        tasks: [
          'Choose a public place for safety and comfort',
          'Pick an activity that allows for conversation',
          'Dress appropriately for the venue',
          'Arrive on time or slightly early',
          'Bring enough money to pay for yourself'
        ]
      },
      {
        phase: 'During the Date',
        tasks: [
          'Put your phone away and be present',
          'Ask open-ended questions about their interests',
          'Share stories about yourself authentically',
          'Listen actively and show genuine interest',
          'Keep the conversation balanced'
        ]
      },
      {
        phase: 'Ending the Date',
        tasks: [
          'Be honest about how you felt the date went',
          'Thank them for their time',
          'Discuss plans for getting home safely',
          'Follow up within a day or two if interested'
        ]
      }
    ],
    tips: [
      'Be yourself - authenticity is attractive',
      'First date nerves are completely normal',
      'Focus on having fun and getting to know them',
      'It\'s okay if there\'s no romantic connection'
    ]
  },
  {
    id: 3,
    title: 'Networking Event',
    icon: 'people',
    color: ['#10b981', '#047857'],
    anxietyLevel: 'medium',
    steps: [
      {
        phase: 'Preparation',
        tasks: [
          'Set realistic goals (meet 3-5 new people)',
          'Prepare a brief introduction about yourself',
          'Bring plenty of business cards',
          'Research who might be attending',
          'Plan conversation starters'
        ]
      },
      {
        phase: 'At the Event',
        tasks: [
          'Start with people who seem approachable',
          'Join conversations near the food or drinks',
          'Ask about their work and show genuine interest',
          'Share your own background when appropriate',
          'Exchange contact information with promising connections'
        ]
      },
      {
        phase: 'Follow-up',
        tasks: [
          'Connect on LinkedIn within 48 hours',
          'Send personalized messages referencing your conversation',
          'Suggest meeting for coffee if there was good rapport',
          'Keep track of new contacts in a system'
        ]
      }
    ],
    tips: [
      'Quality connections matter more than quantity',
      'Listen more than you talk',
      'Help others make connections too',
      'Follow up consistently to build relationships'
    ]
  },
  {
    id: 4,
    title: 'Difficult Conversation',
    icon: 'chatbubble-ellipses',
    color: ['#f59e0b', '#d97706'],
    anxietyLevel: 'high',
    steps: [
      {
        phase: 'Preparation',
        tasks: [
          'Choose the right time and private setting',
          'Think about your main points beforehand',
          'Consider the other person\'s perspective',
          'Prepare to listen as much as you speak',
          'Set a goal for the conversation outcome'
        ]
      },
      {
        phase: 'During Conversation',
        tasks: [
          'Start with something positive if possible',
          'Use "I" statements to express your feelings',
          'Stay calm and avoid accusatory language',
          'Listen to their perspective without interrupting',
          'Work together to find solutions'
        ]
      },
      {
        phase: 'Resolution',
        tasks: [
          'Summarize what you both agreed on',
          'Set clear next steps if needed',
          'Thank them for their time and openness',
          'Follow up on any commitments made'
        ]
      }
    ],
    tips: [
      'Stay focused on the issue, not personal attacks',
      'It\'s okay to take breaks if emotions run high',
      'Seek to understand before being understood',
      'Some conversations may need multiple sessions'
    ]
  }
];

export default function ScenarioPlannerScreen({ navigation, route }) {
  const { templateId } = route.params || {};
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customScenario, setCustomScenario] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState({});
  const [currentPhase, setCurrentPhase] = useState(0);

  useEffect(() => {
    if (templateId) {
      const template = scenarioTemplates.find(t => t.id === templateId);
      setSelectedTemplate(template);
    }
  }, [templateId]);

  const handleTaskCheck = (phaseIndex, taskIndex) => {
    const key = `${phaseIndex}-${taskIndex}`;
    setCheckedTasks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getAnxietyColor = (level) => {
    switch (level) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getAnxietyIcon = (level) => {
    switch (level) {
      case 'low': return 'happy';
      case 'medium': return 'remove';
      case 'high': return 'alert-circle';
      default: return 'help';
    }
  };

  const renderTemplateList = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Scenario Planner</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Get step-by-step guidance for challenging social situations
        </Text>

        <TouchableOpacity
          style={styles.customButton}
          onPress={() => setShowCustomModal(true)}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.customGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add-circle" size={24} color="white" />
            <Text style={styles.customButtonText}>Create Custom Scenario</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Common Scenarios</Text>

        {scenarioTemplates.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={styles.templateCard}
            onPress={() => setSelectedTemplate(template)}
          >
            <LinearGradient
              colors={template.color}
              style={styles.templateGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.templateContent}>
                <View style={styles.templateHeader}>
                  <Ionicons name={template.icon} size={28} color="white" />
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateTitle}>{template.title}</Text>
                    <View style={styles.anxietyIndicator}>
                      <Ionicons 
                        name={getAnxietyIcon(template.anxietyLevel)} 
                        size={14} 
                        color="rgba(255,255,255,0.8)" 
                      />
                      <Text style={styles.anxietyText}>
                        {template.anxietyLevel} anxiety
                      </Text>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.stepCount}>
                  {template.steps.length} phases • {template.steps.reduce((sum, step) => sum + step.tasks.length, 0)} steps
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showCustomModal}
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Custom Scenario</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCustomModal(false)}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Describe your situation:</Text>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={4}
                placeholder="e.g., I need to ask my boss for a raise, or I want to make friends at a new gym..."
                value={customScenario}
                onChangeText={setCustomScenario}
              />
              
              <TouchableOpacity
                style={[
                  styles.createButton,
                  !customScenario.trim() && styles.createButtonDisabled
                ]}
                onPress={() => {
                  if (customScenario.trim()) {
                    Alert.alert(
                      'Custom Scenario Created',
                      'Your personalized guidance plan has been created! This feature will be enhanced with AI-powered suggestions in future updates.',
                      [{ text: 'OK', onPress: () => setShowCustomModal(false) }]
                    );
                  }
                }}
                disabled={!customScenario.trim()}
              >
                <Text style={styles.createButtonText}>Create Plan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  const renderScenarioGuide = () => {
    const currentStepPhase = selectedTemplate.steps[currentPhase];
    const totalTasks = selectedTemplate.steps.reduce((sum, step) => sum + step.tasks.length, 0);
    const completedTasks = Object.values(checkedTasks).filter(Boolean).length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedTemplate(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.title}>{selectedTemplate.title}</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {completedTasks} of {totalTasks} steps completed
            </Text>
            <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <View style={styles.phaseSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedTemplate.steps.map((step, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.phaseButton,
                  currentPhase === index && styles.activePhaseButton
                ]}
                onPress={() => setCurrentPhase(index)}
              >
                <Text style={[
                  styles.phaseButtonText,
                  currentPhase === index && styles.activePhaseButtonText
                ]}>
                  {step.phase}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView style={styles.guideContent}>
          <View style={styles.phaseCard}>
            <Text style={styles.phaseTitle}>{currentStepPhase.phase}</Text>
            
            <View style={styles.tasksList}>
              {currentStepPhase.tasks.map((task, taskIndex) => {
                const key = `${currentPhase}-${taskIndex}`;
                const isChecked = checkedTasks[key];
                
                return (
                  <TouchableOpacity
                    key={taskIndex}
                    style={styles.taskItem}
                    onPress={() => handleTaskCheck(currentPhase, taskIndex)}
                  >
                    <View style={[
                      styles.checkbox,
                      isChecked && styles.checkedBox
                    ]}>
                      {isChecked && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                    <Text style={[
                      styles.taskText,
                      isChecked && styles.completedTaskText
                    ]}>
                      {task}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={20} color="#f59e0b" />
              <Text style={styles.tipsTitle}>Helpful Tips</Text>
            </View>
            
            {selectedTemplate.tips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          <View style={styles.anxietyCard}>
            <View style={styles.anxietyHeader}>
              <Ionicons 
                name={getAnxietyIcon(selectedTemplate.anxietyLevel)} 
                size={20} 
                color={getAnxietyColor(selectedTemplate.anxietyLevel)} 
              />
              <Text style={styles.anxietyTitle}>Anxiety Level: {selectedTemplate.anxietyLevel}</Text>
            </View>
            
            <Text style={styles.anxietyDescription}>
              {selectedTemplate.anxietyLevel === 'high' && 
                "This situation can be very stressful. Remember to use breathing exercises and take breaks if needed."}
              {selectedTemplate.anxietyLevel === 'medium' && 
                "Some nervousness is normal. Focus on preparation and remember that most people are understanding."}
              {selectedTemplate.anxietyLevel === 'low' && 
                "This should be relatively comfortable. Trust yourself and enjoy the experience."}
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  if (!selectedTemplate) {
    return renderTemplateList();
  }

  return renderScenarioGuide();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  content: {
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  customButton: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  customGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  customButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  templateCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  templateGradient: {
    padding: 16,
  },
  templateContent: {
    flex: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  templateInfo: {
    marginLeft: 12,
    flex: 1,
  },
  templateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  anxietyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  anxietyText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  stepCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  phaseSelector: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  phaseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  activePhaseButton: {
    backgroundColor: '#6366f1',
  },
  phaseButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activePhaseButtonText: {
    color: 'white',
  },
  guideContent: {
    flex: 1,
    padding: 16,
  },
  phaseCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  phaseTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  tasksList: {
    gap: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkedBox: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  taskText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  tipsCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginLeft: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#f59e0b',
    marginTop: 8,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  anxietyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  anxietyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  anxietyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  anxietyDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});