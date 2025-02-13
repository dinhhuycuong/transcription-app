"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Loader2, Upload, Copy, Download, Play, Pause } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Utterance {
  speaker: string
  start: number
  end: number
  text: string
}

interface TranscriptionResult {
  utterances: Utterance[]
  status: string
}

const TranscriptionApp: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("assemblyai_key") || ""
    }
    return ""
  })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null)
  const [speakers, setSpeakers] = useState<Record<string, string>>({})
  const [speakerExcerpts, setSpeakerExcerpts] = useState<Record<string, Utterance[]>>({})
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAudio, setCurrentAudio] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const activeTimeUpdateHandler = useRef<(() => void) | null>(null)

  useEffect(() => {
    audioRef.current = new Audio()
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }
    }
  }, [])

  const uploadToAssemblyAI = async (audioFile: File) => {
    if (!apiKey) {
      throw new Error("Please enter your AssemblyAI API key")
    }

    try {
      // Upload the audio file
      const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
        method: "POST",
        headers: {
          Authorization: apiKey,
        },
        body: audioFile,
      })

      if (!uploadResponse.ok) throw new Error("Failed to upload audio file")
      const uploadData = await uploadResponse.json()
      const audioUrl = uploadData.upload_url

      // Start transcription
      const transcribeResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          speaker_labels: true,
        }),
      })

      if (!transcribeResponse.ok) throw new Error("Failed to initiate transcription")
      const transcribeData = await transcribeResponse.json()

      // Poll for results
      const result = await pollTranscriptionStatus(transcribeData.id)
      return result
    } catch (error) {
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const pollTranscriptionStatus = async (transcriptId: string) => {
    if (!apiKey) {
      throw new Error("Please enter your AssemblyAI API key")
    }

    const interval = 1000
    const maxAttempts = 120
    let attempts = 0

    while (attempts < maxAttempts) {
      const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          Authorization: apiKey,
        },
      })

      const data = await response.json()

      if (data.status === "completed") {
        return data
      } else if (data.status === "error") {
        throw new Error("Transcription failed")
      }

      attempts++
      await new Promise((resolve) => setTimeout(resolve, interval))
    }

    throw new Error("Transcription timed out")
  }

  const findSpeakerExcerpts = (utterances: Utterance[]) => {
    const excerptsBySpeaker: Record<string, Utterance[]> = {}

    utterances.forEach((utterance) => {
      if (!excerptsBySpeaker[utterance.speaker]) {
        excerptsBySpeaker[utterance.speaker] = []
      }
      excerptsBySpeaker[utterance.speaker].push(utterance)
    })

    const result: Record<string, Utterance[]> = {}
    Object.keys(excerptsBySpeaker).forEach((speaker) => {
      const speakerUtterances = excerptsBySpeaker[speaker]
      const sortedUtterances = [...speakerUtterances].sort((a, b) => b.end - b.start - (a.end - a.start))
      result[speaker] = sortedUtterances.slice(0, 3)
    })

    return result
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const uploadedFile = input.files?.[0]
    input.value = "" // Clear input immediately

    if (uploadedFile && uploadedFile.type.startsWith("audio/")) {
      // Stop any current audio playback
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }

      // Clear all previous states
      setIsPlaying(false)
      setCurrentAudio(null)
      setFile(uploadedFile)
      setError(null)
      setTranscription(null)
      setSpeakers({})
      setSpeakerExcerpts({})
    } else if (uploadedFile) {
      setError("Please upload a valid audio file")
      setFile(null)
    }
  }

  const handleSubmit = async () => {
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const result = await uploadToAssemblyAI(file)
      setTranscription(result)

      const uniqueSpeakers = Array.from(new Set(result.utterances.map((u) => u.speaker)))
      const initialSpeakers: Record<string, string> = {}
      uniqueSpeakers.forEach((speaker) => {
        initialSpeakers[speaker] = ""
      })
      setSpeakers(initialSpeakers)

      const excerpts = findSpeakerExcerpts(result.utterances)
      setSpeakerExcerpts(excerpts)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error processing the audio file")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSpeakerNameChange = (speakerId: string, name: string) => {
    setSpeakers((prev) => ({
      ...prev,
      [speakerId]: name,
    }))
  }

  const formatTimestamp = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const pad = (num: number) => num.toString().padStart(2, "0")

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  const stopCurrentPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      if (activeTimeUpdateHandler.current) {
        audioRef.current.removeEventListener("timeupdate", activeTimeUpdateHandler.current)
        activeTimeUpdateHandler.current = null
      }
      audioRef.current.src = ""
    }
    setIsPlaying(false)
    setCurrentAudio(null)
  }

  const playAudioExcerpt = async (start: number, end: number) => {
    if (!file || !audioRef.current) return

    try {
      // Stop any current playback
      stopCurrentPlayback()

      // If clicking the same excerpt that was playing, just stop
      if (currentAudio === `${start}-${end}`) {
        return
      }

      // Create new audio source
      const blob = new Blob([file], { type: file.type })
      const url = URL.createObjectURL(blob)

      // Set up new audio
      audioRef.current.src = url
      audioRef.current.currentTime = start / 1000

      // Create new timeupdate handler
      const handleTimeUpdate = () => {
        if (audioRef.current && audioRef.current.currentTime >= end / 1000) {
          stopCurrentPlayback()
          URL.revokeObjectURL(url)
        }
      }

      // Store the handler reference for cleanup
      activeTimeUpdateHandler.current = handleTimeUpdate
      audioRef.current.addEventListener("timeupdate", handleTimeUpdate)

      // Play the audio
      await audioRef.current.play()
      setIsPlaying(true)
      setCurrentAudio(`${start}-${end}`)
    } catch (err) {
      console.error("Audio playback error:", err)
      stopCurrentPlayback()
    }
  }

  const copyToClipboard = () => {
    if (!transcription) return

    const formattedText = transcription.utterances
      .map((utterance) => {
        const speakerName = speakers[utterance.speaker] || `Speaker ${utterance.speaker}`
        return `${speakerName} ${formatTimestamp(utterance.start)}\n${utterance.text}\n`
      })
      .join("\n")

    navigator.clipboard.writeText(formattedText)
  }

  const downloadTranscription = () => {
    if (!transcription) return

    const formattedText = transcription.utterances
      .map((utterance) => {
        const speakerName = speakers[utterance.speaker] || `Speaker ${utterance.speaker}`
        return `${speakerName} ${formatTimestamp(utterance.start)}\n${utterance.text}\n`
      })
      .join("\n")

    const blob = new Blob([formattedText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "transcription.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">VoiceScribe AI</h1>
        <p className="text-muted-foreground text-lg">Transform your conversations into text with speaker recognition</p>
      </div>

      {/* API Key Alert */}
      {!apiKey && (
        <Card>
          <CardHeader>
            <CardTitle>API Key Required</CardTitle>
            <CardDescription>
              Get your free API key from{" "}
              <a
                href="https://www.assemblyai.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                AssemblyAI
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              placeholder="Enter your AssemblyAI API key"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                localStorage.setItem("assemblyai_key", e.target.value)
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Upload Section */}
      <Card>
        <CardContent className="pt-6">
          <div
            className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Click to upload or drag and drop audio file</p>
            {file && <p className="mt-2 text-sm text-muted-foreground">Current file: {file.name}</p>}
          </div>

          {file && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Transcribe"
                )}
              </Button>
            </div>
          )}
          <input ref={fileInputRef} type="file" onChange={handleFileUpload} accept="audio/*" className="hidden" />
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {transcription && (
        <div className="grid gap-8 md:grid-cols-2">
          {/* Speaker Names Section */}
          <Card>
            <CardHeader>
              <CardTitle>Speakers</CardTitle>
              <CardDescription>Customize speaker names and listen to excerpts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.keys(speakers).map((speakerId) => (
                <div key={speakerId} className="space-y-4">
                  <Input
                    value={speakers[speakerId]}
                    onChange={(e) => handleSpeakerNameChange(speakerId, e.target.value)}
                    placeholder={`Enter name for Speaker ${speakerId}`}
                  />
                  <div className="space-y-3 pl-4">
                    {speakerExcerpts[speakerId]?.map((excerpt, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => playAudioExcerpt(excerpt.start, excerpt.end)}
                          className="h-8 w-8"
                        >
                          {currentAudio === `${excerpt.start}-${excerpt.end}` && isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <span className="text-sm text-muted-foreground">{formatTimestamp(excerpt.start)}</span>
                          <p className="text-sm line-clamp-2">{excerpt.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Transcription</CardTitle>
                <CardDescription>Complete conversation transcript</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={copyToClipboard} title="Copy to clipboard">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={downloadTranscription} title="Download as text file">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {transcription.utterances.map((utterance, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {speakers[utterance.speaker] || `Speaker ${utterance.speaker}`}
                        </span>
                        <span className="text-sm text-muted-foreground">{formatTimestamp(utterance.start)}</span>
                      </div>
                      <p className="pl-4 text-muted-foreground">{utterance.text}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
      <audio ref={audioRef} className="hidden" />
    </div>
  )
}

export default TranscriptionApp