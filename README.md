# AI Math Tutor v2

An AI-powered mathematics tutor for Singapore Primary 1-6 students, aligned with the MOE Primary Mathematics Syllabus.

## Features

- **SHOW Mode**: Get complete solutions with step-by-step explanations
- **TEACH Mode**: Learn through Socratic guidance with progressive hints
- **Image Upload**: Take photos of homework problems for AI analysis
- **Chat History**: Sessions saved locally in your browser
- **Dark/Light Mode**: Toggle between themes with preference persistence
- **Responsive Design**: Works on mobile, tablet, and desktop

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **AI**: Google Gemini 2.0 Flash API
- **Storage**: Browser localStorage (no database required)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Google AI Studio API key ([Get one here](https://aistudio.google.com/apikey))

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ai-math-tutor-v2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env.local
   ```

4. Add your Gemini API key to `.env.local`:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/chat/          # Chat API route (Gemini integration)
│   ├── chat/              # Chat interface page
│   ├── home/              # Home/navigation page
│   ├── page.tsx           # Landing page
│   ├── layout.tsx         # Root layout with ThemeProvider
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ChatSidebar.tsx    # Session list sidebar
│   ├── Header.tsx         # App header with logo/theme toggle
│   ├── ImagePreview.tsx   # Image display with modal
│   ├── LoadingSpinner.tsx # Loading indicators
│   ├── MessageBubble.tsx  # Chat message display
│   ├── MessageComposer.tsx # Message input with image upload
│   ├── ModeToggle.tsx     # SHOW/TEACH mode switcher
│   ├── NavCard.tsx        # Navigation cards
│   ├── ThemeProvider.tsx  # Dark/light mode context
│   └── UsernameForm.tsx   # Username input form
├── lib/                   # Utility functions
│   ├── chat.ts            # Chat utilities
│   ├── gemini.ts          # Gemini API client
│   ├── prompts.ts         # AI prompt templates
│   ├── rateLimit.ts       # API rate limiting
│   └── storage.ts         # localStorage utilities
├── data/                  # Static data
│   └── MOE.md             # Singapore MOE syllabus reference
└── types/                 # TypeScript definitions
    └── index.ts           # Core type interfaces
```

## Usage

### SHOW Mode
Select SHOW mode to receive complete solutions. The AI will:
- Provide the full answer immediately
- Show step-by-step working
- Explain concepts in age-appropriate language

### TEACH Mode
Select TEACH mode for guided learning. The AI will:
- Ask guiding questions first
- Encourage you to try before revealing answers
- Provide progressive hints based on your attempts
- Only show the full solution after 2+ attempts or explicit request

### Image Upload
Click the camera icon to upload a photo of:
- Homework problems
- Textbook questions
- Handwritten math work

Supported formats: JPG, PNG, GIF, WebP (max 10MB)

## Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import project in [Vercel Dashboard](https://vercel.com/new)

3. Add environment variable:
   - Name: `GEMINI_API_KEY`
   - Value: Your Google AI API key

4. Deploy

### Manual Build

```bash
npm run build
npm start
```

## Important Notes

- **Data Storage**: All chat history is stored in your browser's localStorage
- **No Account Required**: Just enter a username to start
- **Privacy**: No data is sent to external servers except for AI API calls
- **No Cross-Device Sync**: Data stays on the device where it was created

## API Rate Limiting

The chat API includes rate limiting (20 requests/minute per IP) to prevent abuse.

## License

Private project - All rights reserved

## Contact

[LinkedIn](https://www.linkedin.com/in/javensoh)
