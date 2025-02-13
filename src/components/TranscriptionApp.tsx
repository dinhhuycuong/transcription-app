"use client";

import React, { useState, useRef, useEffect } from "react";
import { Loader2, Upload, Copy, Download, Play, Pause } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Utterance {
  speaker: string;
  start: number;
  end: number;
  text: string;
}

interface TranscriptionResult {
  utterances: Utterance[];
  status: string;
}

const TranscriptionApp: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [transcription, setTranscription] =
    useState<TranscriptionResult | null>(null);
  const [speakers, setSpeakers] = useState<Record<string, string>>({});
  const [speakerExcerpts, setSpeakerExcerpts] = useState<
    Record<string, Utterance[]>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [apiKey, setApiKey] = useState<string>(
    typeof window !== "undefined"
      ? localStorage.getItem("assemblyai_key") || ""
      : ""
  );
  const activeTimeUpdateHandler = useRef<(() => void) | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const createHandleTimeUpdate =
    (end: number, audioElement: HTMLAudioElement, cleanup: () => void) =>
    () => {
      if (audioElement && audioElement.currentTime >= end / 1000) {
        audioElement.pause();
        setIsPlaying(false);
        setCurrentAudio(null);
        cleanup();
      }
    };

  const uploadToAssemblyAI = async (audioFile: File) => {
    if (!apiKey) {
      throw new Error("Please enter your AssemblyAI API key");
    }

    try {
      const uploadResponse = await fetch(
        "https://api.assemblyai.com/v2/upload",
        {
          method: "POST",
          headers: {
            Authorization: apiKey,
          },
          body: audioFile,
        }
      );

      if (!uploadResponse.ok) throw new Error("Failed to upload audio file");
      const uploadData = await uploadResponse.json();
      const audioUrl = uploadData.upload_url;

      const transcribeResponse = await fetch(
        "https://api.assemblyai.com/v2/transcript",
        {
          method: "POST",
          headers: {
            Authorization: apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audio_url: audioUrl,
            speaker_labels: true,
          }),
        }
      );

      if (!transcribeResponse.ok)
        throw new Error("Failed to initiate transcription");
      const transcribeData = await transcribeResponse.json();

      const result = await pollTranscriptionStatus(transcribeData.id);
      return result;
    } catch (error) {
      throw new Error(
        `Transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const pollTranscriptionStatus = async (transcriptId: string) => {
    if (!apiKey) {
      throw new Error("Please enter your AssemblyAI API key");
    }

    const interval = 1000;
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            Authorization: apiKey,
          },
        }
      );

      const data = await response.json();

      if (data.status === "completed") {
        return data;
      } else if (data.status === "error") {
        throw new Error("Transcription failed");
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error("Transcription timed out");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Reset file input first
    const input = event.target;
    const uploadedFile = input.files?.[0];
    input.value = ""; // Clear input immediately

    if (uploadedFile && uploadedFile.type.startsWith("audio/")) {
      // Stop any current audio playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }

      // Clear all previous states
      setIsPlaying(false);
      setCurrentAudio(null);
      setFile(uploadedFile);
      setError(null);
      setTranscription(null);
      setSpeakers({});
      setSpeakerExcerpts({});
    } else if (uploadedFile) {
      // If file was selected but invalid type
      setError("Please upload a valid audio file");
      setFile(null);
    }
  };

  const findSpeakerExcerpts = (utterances: Utterance[]) => {
    const excerptsBySpeaker: Record<string, Utterance[]> = {};

    utterances.forEach((utterance) => {
      if (!excerptsBySpeaker[utterance.speaker]) {
        excerptsBySpeaker[utterance.speaker] = [];
      }
      excerptsBySpeaker[utterance.speaker].push(utterance);
    });

    const result: Record<string, Utterance[]> = {};
    Object.keys(excerptsBySpeaker).forEach((speaker) => {
      const speakerUtterances = excerptsBySpeaker[speaker];
      const sortedUtterances = [...speakerUtterances].sort(
        (a, b) => b.end - b.start - (a.end - a.start)
      );
      result[speaker] = sortedUtterances.slice(0, 3);
    });

    return result;
  };

  const handleSpeakerNameChange = (speakerId: string, name: string) => {
    setSpeakers((prev) => ({
      ...prev,
      [speakerId]: name,
    }));
  };

  const formatTimestamp = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => num.toString().padStart(2, "0");

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const stopCurrentPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (activeTimeUpdateHandler.current) {
        audioRef.current.removeEventListener(
          "timeupdate",
          activeTimeUpdateHandler.current
        );
        activeTimeUpdateHandler.current = null;
      }
      audioRef.current.src = "";
    }
    setIsPlaying(false);
    setCurrentAudio(null);
  };

  const playAudioExcerpt = async (start: number, end: number) => {
    if (!file || !audioRef.current) return;

    try {
      // Stop any current playback
      stopCurrentPlayback();

      // If clicking the same excerpt that was playing, just stop
      if (currentAudio === `${start}-${end}`) {
        return;
      }

      // Create new audio source
      const blob = new Blob([file], { type: file.type });
      const url = URL.createObjectURL(blob);

      // Set up new audio
      audioRef.current.src = url;
      audioRef.current.currentTime = start / 1000;

      // Create new timeupdate handler
      const handleTimeUpdate = () => {
        if (audioRef.current && audioRef.current.currentTime >= end / 1000) {
          stopCurrentPlayback();
          URL.revokeObjectURL(url);
        }
      };

      // Store the handler reference for cleanup
      activeTimeUpdateHandler.current = handleTimeUpdate;
      audioRef.current.addEventListener("timeupdate", handleTimeUpdate);

      // Play the audio
      await audioRef.current.play();
      setIsPlaying(true);
      setCurrentAudio(`${start}-${end}`);
    } catch (err) {
      console.error("Audio playback error:", err);
      stopCurrentPlayback();
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const copyToClipboard = () => {
    if (!transcription) return;

    const formattedText = transcription.utterances
      .map((utterance) => {
        const speakerName =
          speakers[utterance.speaker] || `Speaker ${utterance.speaker}`;
        return `${speakerName} ${formatTimestamp(utterance.start)}\n${utterance.text}\n`;
      })
      .join("\n");

    navigator.clipboard.writeText(formattedText);
  };

  const downloadTranscription = () => {
    if (!transcription) return;

    const formattedText = transcription.utterances
      .map((utterance) => {
        const speakerName =
          speakers[utterance.speaker] || `Speaker ${utterance.speaker}`;
        return `${speakerName} ${formatTimestamp(utterance.start)}\n${utterance.text}\n`;
      })
      .join("\n");

    const blob = new Blob([formattedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcription.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const result = await uploadToAssemblyAI(file);
      setTranscription(result);

      const uniqueSpeakers = Array.from(
        new Set<string>(result.utterances.map((u: Utterance) => u.speaker))
      );
      const initialSpeakers: Record<string, string> = {};
      uniqueSpeakers.forEach((speaker: string) => {
        initialSpeakers[speaker] = "";
      });
      setSpeakers(initialSpeakers);

      const excerpts = findSpeakerExcerpts(result.utterances);
      setSpeakerExcerpts(excerpts);
    } catch (err) {
      setError("Error processing the audio file. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">
        Conversation Transcription with Speaker Recognition
      </h1>

      {/* API Key Input */}
      {!apiKey && (
        <div className="mb-6">
          <Alert>
            <AlertDescription>
              You need an AssemblyAI API key to use this app. Get one for free
              at{" "}
              <a
                href="https://www.assemblyai.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                AssemblyAI
              </a>
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <input
              type="text"
              placeholder="Enter your AssemblyAI API key"
              className="p-2 border rounded w-full"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                localStorage.setItem("assemblyai_key", e.target.value);
              }}
            />
          </div>
        </div>
      )}

      {/* File Upload Section */}
      <div className="space-y-6">
        {file ? (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => document.getElementById("file-upload")?.click()}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <Upload className="h-5 w-5 text-gray-500" />
              </button>
              <span className="truncate max-w-md">{file.name}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? (
                <div className="flex items-center">
                  <Loader2 className="animate-spin mr-2" />
                  Processing...
                </div>
              ) : (
                "Transcribe"
              )}
            </button>
          </div>
        ) : (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4">Click to upload or drag and drop audio file</p>
          </div>
        )}
        <input
          id="file-upload"
          type="file"
          onChange={handleFileUpload}
          accept="audio/*"
          className="hidden"
        />
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Speaker Names with Excerpts */}
      {transcription && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Speaker Names</h2>
          <div className="space-y-6">
            {Object.keys(speakers).map((speakerId) => (
              <div key={speakerId} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="min-w-24">Speaker {speakerId}:</label>
                  <input
                    type="text"
                    value={speakers[speakerId]}
                    onChange={(e) =>
                      handleSpeakerNameChange(speakerId, e.target.value)
                    }
                    placeholder={`Enter name for Speaker ${speakerId}`}
                    className="flex-1 p-2 border rounded"
                  />
                </div>
                {speakerExcerpts[speakerId] && (
                  <div className="ml-24 space-y-4">
                    {" "}
                    {/* Increased spacing */}
                    {speakerExcerpts[speakerId].map((excerpt, idx) => (
                      <div
                        key={idx}
                        className="flex items-start space-x-2 text-sm"
                      >
                        <button
                          onClick={() =>
                            playAudioExcerpt(excerpt.start, excerpt.end)
                          }
                          className="p-1 hover:bg-gray-100 rounded mt-1"
                        >
                          {currentAudio === `${excerpt.start}-${excerpt.end}` &&
                          isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </button>
                        <div>
                          <span className="text-gray-600 block mb-1">
                            {formatTimestamp(excerpt.start)}:
                          </span>
                          <p className="line-clamp-3 text-gray-800">
                            {excerpt.text}
                          </p>{" "}
                          {/* Limit to 3 lines */}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcription Display */}
      {transcription && (
        <div className="space-y-6">
          {" "}
          {/* Increased spacing */}
          {transcription && (
            <div className="space-y-6">
              {" "}
              {/* Increased spacing */}
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Transcription</h2>
                <div className="space-x-3">
                  {" "}
                  {/* Increased spacing */}
                  <button
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                  <button
                    onClick={downloadTranscription}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Download as text file"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="space-y-5 p-6 bg-gray-50 rounded-lg">
                {" "}
                {/* Increased padding and spacing */}
                {transcription.utterances.map((utterance, index) => (
                  <div key={index} className="space-y-2">
                    <div className="text-sm text-gray-600">
                      {speakers[utterance.speaker] ||
                        `Speaker ${utterance.speaker}`}{" "}
                      {formatTimestamp(utterance.start)}
                    </div>
                    <p className="pl-4 text-gray-800">{utterance.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TranscriptionApp;
