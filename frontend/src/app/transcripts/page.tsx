"use client"

import type React from "react"

import { useState, useEffect } from "react"
import MainLayout from "@/components/ui/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { FileText, Upload, Download, Trash2, Loader2, Plus, Calendar } from "lucide-react"

interface Transcript {
  id: string
  title: string
  content: string
  createdAt: string
  taskCount: number
}

export default function TranscriptsPage() {
  const [transcriptText, setTranscriptText] = useState("")
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    // Mock data - replace with actual API call to GET /transcripts/
    const mockTranscripts: Transcript[] = [
      {
        id: "1",
        title: "Weekly Team Meeting - Jan 15",
        content: "Discussion about project milestones and upcoming deadlines...",
        createdAt: "2024-01-15",
        taskCount: 3,
      },
      {
        id: "2",
        title: "Client Call - Project Requirements",
        content: "Client feedback on initial designs and feature requests...",
        createdAt: "2024-01-14",
        taskCount: 5,
      },
      {
        id: "3",
        title: "Sprint Planning Meeting",
        content: "Planning for the next development sprint and task allocation...",
        createdAt: "2024-01-13",
        taskCount: 2,
      },
    ]

    setTranscripts(mockTranscripts)
  }, [])

  const handleGenerateTasks = async () => {
    if (!transcriptText.trim()) {
      toast.error("Please enter a transcript before generating tasks.")
      return
    }

    setIsGenerating(true)

    try {
      // Mock API call - replace with actual POST to generate tasks
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Create new transcript
      const newTranscript: Transcript = {
        id: Date.now().toString(),
        title: `Meeting Transcript - ${new Date().toLocaleDateString()}`,
        content: transcriptText,
        createdAt: new Date().toISOString().split("T")[0],
        taskCount: Math.floor(Math.random() * 5) + 1,
      }

      setTranscripts((prev) => [newTranscript, ...prev])
      setTranscriptText("")

      toast.success(`Generated ${newTranscript.taskCount} tasks from your transcript.`)
    } catch (error) {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      // Mock file upload - replace with actual POST /transcripts/upload
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setTranscriptText(content)
        toast.success("Transcript content has been loaded.")
      }
      reader.readAsText(file)
    } catch (error) {
      toast.error("Failed to upload file. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (transcriptId: string) => {
    try {
      // Mock API call - replace with actual GET /transcripts/{transcript_id}/download
      const transcript = transcripts.find((t) => t.id === transcriptId)
      if (transcript) {
        const blob = new Blob([transcript.content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${transcript.title}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.success("Transcript file is being downloaded.")
      }
    } catch (error) {
      toast.error("Failed to download transcript.")
    }
  }

  const handleDelete = async (transcriptId: string) => {
    try {
      // Mock API call - replace with actual DELETE /transcripts/{transcript_id}
      await new Promise((resolve) => setTimeout(resolve, 300))

      setTranscripts((prev) => prev.filter((t) => t.id !== transcriptId))

      toast.success("Transcript has been deleted successfully.")
    } catch (error) {
      toast.error("Failed to delete transcript.")
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transcripts</h1>
          <p className="text-gray-600 mt-2">Submit meeting transcripts and generate AI-powered tasks</p>
        </div>

        {/* Submit Transcript Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="mr-2 h-5 w-5 text-blue-500" />
              Submit New Transcript
            </CardTitle>
            <CardDescription>Paste your meeting transcript or upload a file to generate tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Paste your meeting transcript here..."
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleGenerateTasks}
                disabled={isGenerating || !transcriptText.trim()}
                className="flex-1"
              >
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isGenerating ? "Generating Tasks..." : "Generate Tasks"}
              </Button>

              <div className="relative">
                <Input
                  type="file"
                  accept=".txt,.doc,.docx"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                <Button variant="outline" disabled={isUploading}>
                  {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {isUploading ? "Uploading..." : "Upload File"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Previous Transcripts Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-green-500" />
              Previous Transcripts
            </CardTitle>
            <CardDescription>View and manage your uploaded transcripts</CardDescription>
          </CardHeader>
          <CardContent>
            {transcripts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No transcripts available. Upload your first transcript above!
              </p>
            ) : (
              <div className="space-y-3">
                {transcripts.map((transcript) => (
                  <div
                    key={transcript.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{transcript.title}</h3>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <Calendar className="mr-1 h-3 w-3" />
                        {new Date(transcript.createdAt).toLocaleDateString()}
                        <span className="mx-2">•</span>
                        <span>{transcript.taskCount} tasks generated</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => handleDownload(transcript.id)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(transcript.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
