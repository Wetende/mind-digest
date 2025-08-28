import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import socialProgressService from "../services/socialProgressService";

const rolePlayScenarios = [
  {
    id: 1,
    title: "Meeting New People at a Party",
    description:
      "Practice introducing yourself and making conversation at social gatherings",
    difficulty: "Beginner",
    estimatedTime: "5-10 minutes",
    scenario: {
      setting:
        "You're at a friend's birthday party and don't know many people. You see someone standing alone by the snack table.",
      character: "Alex - A friendly person who seems approachable",
      objective: "Start a conversation and find common ground",
      conversation: [
        {
          id: 1,
          speaker: "system",
          text: "You approach Alex who is looking at the snacks. What's your opening line?",
          options: [
            {
              id: "a",
              text: "Hi! I'm [Your name]. Great party, isn't it?",
              response:
                "Hey! I'm Alex. Yeah, [Friend's name] really knows how to throw a party! How do you know them?",
              feedback:
                "Great start! You introduced yourself and made a positive comment about the party.",
              points: 10,
            },
            {
              id: "b",
              text: "These snacks look amazing!",
              response:
                "They really do! I've been eyeing that cheese board. I'm Alex, by the way.",
              feedback:
                "Good ice breaker! Commenting on shared experiences is a natural way to start.",
              points: 8,
            },
            {
              id: "c",
              text: "Do you know where the bathroom is?",
              response: "Oh, I think it's down the hall. I'm Alex.",
              feedback:
                "While practical, this doesn't lead to much conversation. Try a more engaging opener.",
              points: 3,
            },
          ],
        },
        {
          id: 2,
          speaker: "system",
          text: "Alex seems friendly and interested in talking. How do you continue the conversation?",
          options: [
            {
              id: "a",
              text: "I work with [Friend's name] at the marketing agency. What about you?",
              response:
                "Oh cool! I'm actually [Friend's name]'s college roommate. Small world! What kind of marketing do you do?",
              feedback:
                "Perfect! You shared how you know the host and asked about them. This builds connection.",
              points: 10,
            },
            {
              id: "b",
              text: "So... nice weather today, right?",
              response:
                "Yeah, it's been pretty good. Though I heard it might rain tomorrow.",
              feedback:
                "Weather talk is safe but can feel forced. Try connecting through the shared experience instead.",
              points: 5,
            },
            {
              id: "c",
              text: "I love your shirt! Where did you get it?",
              response:
                "Thanks! I got it at this little boutique downtown. I love finding unique pieces.",
              feedback:
                "Great compliment! Personal style is a good conversation topic that shows you're paying attention.",
              points: 9,
            },
          ],
        },
      ],
    },
  },
  {
    id: 2,
    title: "Making Small Talk with Coworkers",
    description:
      "Navigate workplace conversations and build professional relationships",
    difficulty: "Intermediate",
    estimatedTime: "7-12 minutes",
    scenario: {
      setting:
        "You're in the office kitchen making coffee when a coworker you don't know well comes in.",
      character: "Jordan - A colleague from another department",
      objective:
        "Make a positive impression and potentially build a workplace friendship",
      conversation: [
        {
          id: 1,
          speaker: "system",
          text: "Jordan enters the kitchen and starts making tea. What's your approach?",
          options: [
            {
              id: "a",
              text: "Good morning! I don't think we've officially met. I'm [Your name] from [Department].",
              response:
                "Good morning! I'm Jordan from the design team. Nice to finally put a name to the face!",
              feedback:
                "Professional and friendly introduction. Perfect for workplace settings.",
              points: 10,
            },
            {
              id: "b",
              text: "The coffee here is terrible, isn't it?",
              response:
                "Haha, it's definitely not the best. I've switched to bringing my own tea bags.",
              feedback:
                "Bonding over shared complaints can work, but starting positive is usually better.",
              points: 6,
            },
            {
              id: "c",
              text: "*Just smile and nod*",
              response:
                "*Jordan smiles back but continues making tea in silence*",
              feedback:
                "Non-verbal acknowledgment is polite but missed an opportunity to connect.",
              points: 3,
            },
          ],
        },
      ],
    },
  },
];

export default function RolePlayScreen({ navigation, route }) {
  const { scenarioId } = route.params || {};
  const { user } = useAuth();
  const [currentScenario, setCurrentScenario] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (scenarioId) {
      const scenario = rolePlayScenarios.find((s) => s.id === scenarioId);
      setCurrentScenario(scenario);
    }
  }, [scenarioId]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    setShowFeedback(true);
    setTotalPoints((prev) => prev + option.points);
  };

  const handleContinue = () => {
    if (currentStep < currentScenario.scenario.conversation.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setSelectedOption(null);
      setShowFeedback(false);
      setProgress(
        (currentStep + 1) / currentScenario.scenario.conversation.length
      );
      fadeAnim.setValue(0);
    } else {
      showCompletionScreen();
    }
  };

  const showCompletionScreen = async () => {
    const maxPoints = currentScenario.scenario.conversation.reduce(
      (sum, step) => sum + Math.max(...step.options.map((opt) => opt.points)),
      0
    );
    const percentage = Math.round((totalPoints / maxPoints) * 100);

    // Save progress to database
    if (user) {
      try {
        await socialProgressService.saveRolePlayProgress(
          user.id,
          currentScenario.id,
          totalPoints,
          maxPoints
        );
      } catch (error) {
        console.error("Error saving role-play progress:", error);
      }
    }

    let performance = "Good effort!";
    if (percentage >= 90) performance = "Excellent!";
    else if (percentage >= 70) performance = "Great job!";
    else if (percentage >= 50) performance = "Good work!";

    Alert.alert(
      "Scenario Complete!",
      `${performance}\n\nYou scored ${totalPoints}/${maxPoints} points (${percentage}%)\n\nKey takeaways:\n• Practice active listening\n• Ask open-ended questions\n• Show genuine interest in others\n• Look for common ground`,
      [
        { text: "Try Another Scenario", onPress: () => navigation.goBack() },
        { text: "Finish", onPress: () => navigation.goBack() },
      ]
    );
  };

  const renderScenarioList = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Role-Play Scenarios</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Practice real-world social situations in a safe, guided environment
        </Text>

        {rolePlayScenarios.map((scenario) => (
          <TouchableOpacity
            key={scenario.id}
            style={styles.scenarioCard}
            onPress={() => setCurrentScenario(scenario)}
          >
            <LinearGradient
              colors={["#6366f1", "#8b5cf6"]}
              style={styles.scenarioGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.scenarioContent}>
                <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                <Text style={styles.scenarioDescription}>
                  {scenario.description}
                </Text>

                <View style={styles.scenarioMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="time"
                      size={16}
                      color="rgba(255,255,255,0.8)"
                    />
                    <Text style={styles.metaText}>
                      {scenario.estimatedTime}
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons
                      name="bar-chart"
                      size={16}
                      color="rgba(255,255,255,0.8)"
                    />
                    <Text style={styles.metaText}>{scenario.difficulty}</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderRolePlay = () => {
    const currentConversation =
      currentScenario.scenario.conversation[currentStep];

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScenario(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.title}>{currentScenario.title}</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            Step {currentStep + 1} of{" "}
            {currentScenario.scenario.conversation.length}
          </Text>
        </View>

        <ScrollView style={styles.rolePlayContent}>
          <View style={styles.settingCard}>
            <Ionicons name="location" size={20} color="#6366f1" />
            <Text style={styles.settingText}>
              {currentScenario.scenario.setting}
            </Text>
          </View>

          <Animated.View
            style={[styles.conversationCard, { opacity: fadeAnim }]}
          >
            <Text style={styles.conversationText}>
              {currentConversation.text}
            </Text>

            {!showFeedback && (
              <View style={styles.optionsContainer}>
                {currentConversation.options.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionButton,
                      selectedOption?.id === option.id && styles.selectedOption,
                    ]}
                    onPress={() => handleOptionSelect(option)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedOption?.id === option.id &&
                          styles.selectedOptionText,
                      ]}
                    >
                      {option.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {showFeedback && selectedOption && (
              <View style={styles.feedbackContainer}>
                <View style={styles.responseCard}>
                  <Text style={styles.responseLabel}>Response:</Text>
                  <Text style={styles.responseText}>
                    "{selectedOption.response}"
                  </Text>
                </View>

                <View style={styles.feedbackCard}>
                  <View style={styles.feedbackHeader}>
                    <Ionicons
                      name={
                        selectedOption.points >= 8
                          ? "checkmark-circle"
                          : selectedOption.points >= 5
                          ? "information-circle"
                          : "warning"
                      }
                      size={20}
                      color={
                        selectedOption.points >= 8
                          ? "#10b981"
                          : selectedOption.points >= 5
                          ? "#3b82f6"
                          : "#f59e0b"
                      }
                    />
                    <Text style={styles.feedbackTitle}>Feedback</Text>
                    <Text style={styles.pointsText}>
                      +{selectedOption.points} points
                    </Text>
                  </View>
                  <Text style={styles.feedbackText}>
                    {selectedOption.feedback}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={handleContinue}
                >
                  <Text style={styles.continueButtonText}>
                    {currentStep <
                    currentScenario.scenario.conversation.length - 1
                      ? "Continue"
                      : "Finish Scenario"}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    );
  };

  if (!currentScenario) {
    return renderScenarioList();
  }

  return renderRolePlay();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  content: {
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  scenarioCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scenarioGradient: {
    padding: 20,
  },
  scenarioContent: {
    flex: 1,
  },
  scenarioTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    marginBottom: 8,
  },
  scenarioDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 16,
    lineHeight: 20,
  },
  scenarioMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginLeft: 4,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#6366f1",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  rolePlayContent: {
    flex: 1,
    padding: 16,
  },
  settingCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#e0e7ff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  settingText: {
    flex: 1,
    fontSize: 14,
    color: "#3730a3",
    marginLeft: 12,
    lineHeight: 20,
  },
  conversationCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  conversationText: {
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 20,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
  },
  selectedOption: {
    borderColor: "#6366f1",
    backgroundColor: "#e0e7ff",
  },
  optionText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  selectedOptionText: {
    color: "#3730a3",
    fontWeight: "500",
  },
  feedbackContainer: {
    gap: 16,
  },
  responseCard: {
    backgroundColor: "#f0f9ff",
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
  },
  responseLabel: {
    fontSize: 12,
    color: "#0369a1",
    fontWeight: "600",
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: "#0c4a6e",
    fontStyle: "italic",
    lineHeight: 20,
  },
  feedbackCard: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 8,
  },
  feedbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: 8,
    flex: 1,
  },
  pointsText: {
    fontSize: 12,
    color: "#6366f1",
    fontWeight: "600",
  },
  feedbackText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366f1",
    padding: 16,
    borderRadius: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginRight: 8,
  },
});
