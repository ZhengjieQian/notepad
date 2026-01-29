import { NextRequest, NextResponse } from 'next/server';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Validate request method
  if (req.method !== 'POST') {
    return NextResponse.json(
      { message: 'Method not allowed' },
      { status: 405 }
    );
  }

  try {
    const { text, voiceName } = await req.json();

    // Validate text input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { message: 'Invalid text: must be a non-empty string' },
        { status: 400 }
      );
    }

    console.log(`TTS Request: text="${text.substring(0, 50)}...", voice="${voiceName || 'default'}"`);

    // Get Azure credentials from environment
    const azureKey = process.env.AZURE_TTS_KEY;
    const azureRegion = process.env.AZURE_TTS_REGION;

    if (!azureKey || !azureRegion) {
      console.error('Azure TTS credentials not configured');
      return NextResponse.json(
        { message: 'TTS service not configured' },
        { status: 500 }
      );
    }

    // Create speech configuration
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      azureKey,
      azureRegion
    );

    // Set audio output format (MP3 at 32kbps, 16kHz mono)
    speechConfig.speechSynthesisOutputFormat =
      SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    // Set voice name (default: en-US-AvaMultilingualNeural)
    speechConfig.speechSynthesisVoiceName =
      voiceName || 'en-US-AvaMultilingualNeural';

    // Create synthesizer without audio output config so it captures audio data
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, undefined);

    // Use a promise to handle the async synthesis
    const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
      console.log('Starting speech synthesis...');
      
      synthesizer.speakTextAsync(
        text,
        (result) => {
          console.log(`Synthesis result reason: ${result.reason}`);
          
          if (
            result.reason ===
            SpeechSDK.ResultReason.SynthesizingAudioCompleted
          ) {
            console.log(`Audio data size: ${result.audioData.byteLength} bytes`);
            // Convert the audio data to a Buffer
            const audioData = Buffer.from(result.audioData);
            synthesizer.close();
            resolve(audioData);
          } else if (
            result.reason === SpeechSDK.ResultReason.Canceled
          ) {
            synthesizer.close();
            const errorDetail = (result as any).errorDetails;
            console.error('Speech synthesis canceled:', errorDetail);
            reject(
              new Error(`Speech synthesis canceled: ${errorDetail}`)
            );
          } else {
            synthesizer.close();
            console.error('Speech synthesis failed - result reason:', result.reason);
            reject(
              new Error(`Speech synthesis failed with reason: ${result.reason}`)
            );
          }
        },
        (err) => {
          synthesizer.close();
          console.error('Error during speech synthesis:', err);
          reject(new Error(`Speech synthesis error: ${err}`));
        }
      );
    });

    // Return audio data with appropriate headers
    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('TTS API error:', errorMessage);

    return NextResponse.json(
      { message: 'Speech synthesis failed', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'TTS API endpoint',
      usage: {
        method: 'POST',
        body: {
          text: 'string (required) - Text to convert to speech',
          voiceName:
            'string (optional) - Azure voice name (default: en-US-AvaMultilingualNeural)',
        },
      },
    },
    { status: 200 }
  );
}
