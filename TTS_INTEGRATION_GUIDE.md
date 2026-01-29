# Text-to-Speech Integration Guide

This guide demonstrates how to use the TTS (Text-to-Speech) components and hooks in your application.

## Components & Hooks Available

### 1. **TextToSpeechPlayer Component** (Recommended for most use cases)
A pre-built, fully-featured component with UI controls.

**Location:** `src/components/ui/text-to-speech-player.tsx`

**Usage:**
```tsx
import { TextToSpeechPlayer } from '@/components/ui/text-to-speech-player';

export function MyComponent() {
  return (
    <TextToSpeechPlayer
      text="Hello, this is a test message"
      voiceName="en-US-AvaMultilingualNeural" // optional
      showText={true} // Show the text alongside the button
      onPlayStart={() => console.log('Playback started')}
      onPlayEnd={() => console.log('Playback ended')}
      onError={(error) => console.error('Error:', error)}
    />
  );
}
```

**Props:**
- `text` (string): Text to synthesize to speech
- `voiceName` (string, optional): Azure voice name (default: "en-US-AvaMultilingualNeural")
- `onPlayStart` (function, optional): Callback when playback starts
- `onPlayEnd` (function, optional): Callback when playback ends
- `onError` (function, optional): Callback when an error occurs
- `className` (string, optional): Additional CSS classes
- `showText` (boolean, optional): Show text preview next to button

---

### 2. **useTextToSpeech Hook** (For custom UI)
A hook for more granular control over TTS functionality.

**Location:** `src/hooks/use-text-to-speech.ts`

**Usage:**
```tsx
'use client';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';
import { Button } from '@/components/ui/button';

export function CustomTtsComponent() {
  const { isLoading, isPlaying, error, audioRef, play, stop, clearError } =
    useTextToSpeech({
      onPlayStart: () => console.log('Started'),
      onPlayEnd: () => console.log('Ended'),
      onError: (err) => console.error(err),
    });

  return (
    <div>
      <Button
        onClick={() => play('Hello world')}
        disabled={isLoading}
      >
        {isPlaying ? 'Playing...' : 'Play'}
      </Button>

      {isPlaying && <Button onClick={stop}>Stop</Button>}

      {error && (
        <div className="text-red-500">
          {error}
          <button onClick={clearError}>Clear</button>
        </div>
      )}

      {/* The hook provides the audio ref, but it's managed internally */}
      <audio ref={audioRef} />
    </div>
  );
}
```

**Return Values:**
- `isLoading` (boolean): Whether audio is being fetched
- `isPlaying` (boolean): Whether audio is currently playing
- `error` (string | null): Error message if any
- `audioRef` (RefObject<HTMLAudioElement>): Reference to audio element
- `play(text)` (function): Fetch and play audio for given text
- `stop()` (function): Stop playback
- `clearError()` (function): Clear error message

---

### 3. **MessageWithTts Component** (Chat Integration Example)
Pre-configured component for chat messages with TTS.

**Location:** `src/components/chat/MessageWithTts.tsx`

**Usage:**
```tsx
import { MessageWithTts } from '@/components/chat/MessageWithTts';

export function ChatMessage() {
  return (
    <MessageWithTts
      message="Hello! How can I help you today?"
      includePlayButton={true}
      voiceName="en-US-AvaMultilingualNeural"
    />
  );
}
```

---

## API Endpoint

**Endpoint:** `POST /api/tts`

**Request Body:**
```json
{
  "text": "string (required) - Text to convert to speech",
  "voiceName": "string (optional) - Azure voice name"
}
```

**Response:**
- Status 200: Audio stream (audio/mpeg)
- Status 400: Invalid input
- Status 500: Server error

**Example Request:**
```typescript
const response = await fetch('/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Hello world',
    voiceName: 'en-US-AvaMultilingualNeural'
  })
});

const audioBlob = await response.blob();
const audio = new Audio(URL.createObjectURL(audioBlob));
audio.play();
```

---

## Available Azure Voices

Some popular Azure TTS voices:

**English:**
- `en-US-AvaMultilingualNeural` ⭐ (Default - multilingual)
- `en-US-AvaNeural`
- `en-US-JennyNeural`
- `en-US-GuyNeural`
- `en-GB-SoniaNeural`

**Other Languages:**
- `es-ES-AlvaNeural` (Spanish)
- `fr-FR-DeniseNeural` (French)
- `de-DE-AmalaNeural` (German)
- `zh-CN-XiaoxiaoNeural` (Mandarin)
- `ja-JP-NanaMNeural` (Japanese)

See [Azure documentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support) for complete list.

---

## Integration with Chat

To add TTS to your existing chat component, you have two options:

### Option 1: Replace message with TTS component
```tsx
// In MessageList.tsx
import { MessageWithTts } from '@/components/chat/MessageWithTts';

messages.map((msg) => (
  <MessageWithTts key={msg.id} message={msg.content} />
))
```

### Option 2: Add TTS button next to existing message
```tsx
// In MessageList.tsx
import { TextToSpeechPlayer } from '@/components/ui/text-to-speech-player';

messages.map((msg) => (
  <div key={msg.id}>
    <p>{msg.content}</p>
    <TextToSpeechPlayer text={msg.content} />
  </div>
))
```

---

## Error Handling

All components and hooks handle errors gracefully:

```tsx
const { error, clearError } = useTextToSpeech({
  onError: (error) => {
    // Handle error programmatically
    console.error('TTS failed:', error.message);
    // Show toast notification
    // Retry logic, etc.
  }
});

// Or access error state
{error && <AlertDialog>{error}</AlertDialog>}
```

---

## Performance Tips

1. **Memoize callbacks** - Use `useCallback` for `onPlayStart`, `onPlayEnd`, `onError`
2. **Limit text length** - Azure TTS has character limits
3. **Cache audio** - Consider caching audio for frequently spoken text
4. **Cleanup** - The components automatically clean up audio URLs on unmount

---

## Environment Setup

Ensure these variables are in your `.env.local`:

```
AZURE_TTS_KEY=your_azure_key_here
AZURE_TTS_REGION=westus
```

Both are already configured in your project.
