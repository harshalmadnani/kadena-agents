# Kadena Chat App

A React application that integrates Magic authentication for Kadena blockchain with a chat interface that interacts with the k-agent.render.com API.

## Features

- Login with Magic (email) or SpireKey authentication
- Kadena blockchain integration
- Real-time chat interface with AI-powered responses
- User account and wallet information display

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- A Magic API key (sign up at [https://magic.link](https://magic.link))

## Setup

1. Clone the repository:

```bash
git clone [repository-url]
cd kadena-chat-app
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with your Magic API key:

```
REACT_APP_MAGIC_API_KEY=your_magic_api_key
```

Replace `your_magic_api_key` with your actual Magic API key.

## Running the Application

Start the development server:

```bash
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Authentication Flow

The application supports two authentication methods:

1. **Email Authentication**: Users can sign in with their email address. Magic will send a login link to the provided email.
2. **SpireKey Authentication**: Users can sign in using Kadena's SpireKey, a passkey-based authentication method.

## Kadena Integration

The application uses Magic's Kadena extension to interact with the Kadena blockchain:

- User account creation on the Kadena blockchain
- Access to user's Kadena wallet information
- Integration with Kadena's SpireKey login

## Chat Interface

The chat interface allows users to:

- Send queries about Kadena blockchain
- Receive AI-powered responses from the k-agent API
- View conversation history

## Project Structure

```
kadena-chat-app/
├── public/                  # Static files
├── src/
│   ├── components/          # React components
│   │   ├── Chat.tsx         # Chat interface component
│   │   ├── Chat.css         # Chat styles
│   │   ├── Login.tsx        # Login component
│   │   └── Login.css        # Login styles
│   ├── context/             # React context providers
│   │   └── AuthContext.tsx  # Authentication context
│   ├── services/            # API and service integrations
│   │   ├── api.ts           # Chat API service
│   │   └── magic.ts         # Magic SDK configuration
│   ├── App.tsx              # Main application component
│   ├── App.css              # Global styles
│   └── index.tsx            # Application entry point
└── .env                     # Environment variables
```

## Resources

- [Magic Documentation](https://magic.link/docs)
- [Kadena Documentation](https://docs.kadena.io/)
- [Magic Kadena Extension](https://magic.link/docs/blockchains/other-chains/other/kadena)
- [React Router Documentation](https://reactrouter.com/)
