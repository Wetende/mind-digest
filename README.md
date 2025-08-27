# Mind-digest

A mental health and wellness mobile application that combines peer support with practical anxiety management tools, enhanced by multi-platform social sharing capabilities.

## Features

- **Peer Support Networks**: Connect with others who share similar experiences
- **Social Ease Toolkit**: Practical tools for managing social anxiety
- **AI-Powered Journaling**: Smart insights from your daily reflections
- **Mood Tracking**: Monitor your mental health journey
- **Multi-Platform Sharing**: Share your progress across social media
- **Crisis Support**: Emergency resources and safety planning
- **Personalized Recommendations**: AI-driven content and peer suggestions

## Tech Stack

- **Frontend**: React Native 0.81.0 with React 19.1.0
- **Backend**: Supabase (PostgreSQL, Real-time, Auth, Storage)
- **AI/ML**: OpenAI API for insights and content analysis
- **Social Integration**: Platform-specific SDKs (Meta, TikTok, X)
- **State Management**: React Query + Zustand
- **Navigation**: React Navigation 7.0
- **UI Framework**: Custom components with Expo Linear Gradient

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.js
│   ├── Card.js
│   ├── LoadingSpinner.js
│   └── EmergencyButton.js
├── screens/            # Screen components
│   ├── HomeScreen.js
│   ├── PeerSupportScreen.js
│   ├── ToolkitScreen.js
│   ├── JournalScreen.js
│   └── ProfileScreen.js
├── services/           # API and business logic
│   ├── authService.js
│   ├── moodService.js
│   ├── journalService.js
│   └── peerService.js
├── config/             # Configuration files
│   ├── supabase.js
│   └── env.js
├── theme/              # Design system
│   ├── colors.js
│   ├── typography.js
│   ├── spacing.js
│   └── index.js
└── utils/              # Utility functions
    ├── dateUtils.js
    ├── validationUtils.js
    └── formatUtils.js
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd mind-digest
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your actual API keys and configuration
```

4. Start the development server
```bash
npm start
```

### Environment Setup

You'll need to set up the following services:

1. **Supabase**: Create a project at [supabase.com](https://supabase.com)
2. **OpenAI**: Get an API key from [openai.com](https://openai.com)
3. **Social Platform APIs**: Set up developer accounts for Meta, TikTok, and X

## Development

### Running the App

- **iOS**: `npm run ios`
- **Android**: `npm run android`
- **Web**: `npm run web`

### Code Style

This project follows React Native best practices and uses:
- ESLint for code linting
- Prettier for code formatting
- Consistent naming conventions

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Architecture

The app follows a modular architecture with clear separation of concerns:

- **Components**: Reusable UI components with consistent styling
- **Screens**: Full-screen components that compose smaller components
- **Services**: Business logic and API interactions
- **Utils**: Pure functions for common operations
- **Theme**: Centralized design system

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Privacy & Security

Mind-digest takes user privacy seriously:

- End-to-end encryption for sensitive communications
- Anonymous mode for privacy-conscious users
- HIPAA-compliant data handling practices
- Secure authentication with Supabase Auth

## Crisis Support

If you're experiencing a mental health crisis:
- **Emergency**: Call 911
- **Crisis Hotline**: Call 988 (Suicide & Crisis Lifeline)
- **Text Support**: Text HOME to 741741

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Mental health professionals who provided guidance
- Open source community for amazing tools and libraries
- Beta testers who provided valuable feedback