'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TTSTestPage() {
  const [inputText, setInputText] = useState('Hello, this is a test of the text to speech service');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const handlePlayClick = async () => {
    setError(null);
    setLogs([]);
    setIsLoading(true);

    try {
      addLog('Starting TTS request...');
      addLog(`Text: "${inputText}"`);

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      addLog(`Response status: ${response.status}`);
      addLog(`Content-Type: ${response.headers.get('Content-Type')}`);
      addLog(`Content-Length: ${response.headers.get('Content-Length')}`);

      if (!response.ok) {
        const errorData = await response.json();
        addLog(`Error response: ${JSON.stringify(errorData)}`);
        throw new Error(errorData.details || 'TTS API failed');
      }

      const audioBlob = await response.blob();
      addLog(`Audio blob received - Size: ${audioBlob.size} bytes, Type: ${audioBlob.type}`);

      if (audioBlob.size === 0) {
        throw new Error('Received empty audio data');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      addLog(`Audio URL created: ${audioUrl}`);

      const audio = new Audio(audioUrl);
      addLog('Audio element created');

      audio.onplay = () => {
        addLog('Audio playback started');
      };

      audio.onended = () => {
        addLog('Audio playback ended');
      };

      audio.onerror = (e) => {
        addLog(`Audio error: ${audio.error?.message || 'Unknown error'}`);
      };

      addLog('Calling audio.play()...');
      await audio.play();
      addLog('audio.play() resolved successfully');

      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`ERROR: ${errorMessage}`);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">TTS Service Test</h1>
          <p className="text-muted-foreground">
            Test the Text-to-Speech API and see detailed logs
          </p>
        </div>

        {/* Input Card */}
        <Card>
          <CardHeader>
            <CardTitle>Input Text</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full p-3 border rounded-lg bg-background text-foreground placeholder-muted-foreground"
              rows={4}
              placeholder="Enter text to convert to speech..."
            />

            <Button
              onClick={handlePlayClick}
              disabled={isLoading || !inputText.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Processing...' : 'Play Sound'}
            </Button>
          </CardContent>
        </Card>

        {/* Error Card */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Logs Card */}
        <Card>
          <CardHeader>
            <CardTitle>Request Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">No logs yet. Click "Play Sound" to start.</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-foreground">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>How This Works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>1. Enter or modify the text in the input field</p>
            <p>2. Click the "Play Sound" button</p>
            <p>3. Watch the logs below to see:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>TTS API request being sent</li>
              <li>Response status and headers</li>
              <li>Audio blob size and type</li>
              <li>Audio playback events</li>
            </ul>
            <p>4. You should hear the audio if everything works correctly</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
