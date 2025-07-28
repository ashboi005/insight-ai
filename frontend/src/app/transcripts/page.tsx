"use client"

import type React from "react"

import { useState, useEffect } from "react"
import MainLayout from "@/components/ui/layout/main-layout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { FileText, Upload, Download, Trash2, Loader2, Plus, Calendar } from "lucide-react"
import { transcriptsAPI, Transcript } from "@/lib/api"

export default function TranscriptsPage() {
  const [transcriptText, setTranscriptText] = useState("")
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadTranscripts = async () => {
    try {
      setIsLoading(true)
      const data = await transcriptsAPI.getAll()
      setTranscripts(data)
    } catch (error) {
      console.error('Failed to load transcripts:', error)
      toast.error('Failed to load transcripts')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTranscripts()
  }, [])

  const handleGenerateTasks = async () => {
    if (!transcriptText.trim()) {
      toast.error("Please enter a transcript before generating tasks.")
      return
    }

    setIsGenerating(true)

    try {
      // First create the transcript
      const newTranscript = await transcriptsAPI.create({
        title: `Meeting Transcript - ${new Date().toLocaleDateString()}`,
        content: transcriptText,
      })

      // Then generate tasks from the transcript
      const tasksResponse = await transcriptsAPI.generateTasks(newTranscript.id)

      // Reload transcripts to get updated data
      await loadTranscripts()
      setTranscriptText("")

      toast.success(`Generated ${tasksResponse.tasks.length} tasks from your transcript.`)
    } catch (error) {
      console.error('Failed to generate tasks:', error)
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
      // Read the file content and show it in the text area for editing
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setTranscriptText(content) // Put the extracted text in the form field
        toast.success("File content loaded! You can now edit it and generate tasks.")
      }
      
      reader.onerror = () => {
        toast.error("Failed to read file. Please try again.")
      }
      
      reader.readAsText(file)
    } catch (error) {
      console.error('Failed to read file:', error)
      toast.error("Failed to read file. Please try again.")
    } finally {
      setIsUploading(false)
      // Reset the file input
      event.target.value = ""
    }
  }

  const handleDownload = async (transcriptId: number) => {
    try {
      await transcriptsAPI.download(transcriptId)
      toast.success("Transcript downloaded successfully!")
    } catch (error) {
      console.error('Failed to download transcript:', error)
      toast.error("Failed to download transcript. Please try again.")
    }
  }

  const handleDelete = async (transcriptId: number) => {
    if (!confirm('Are you sure you want to delete this transcript?')) {
      return
    }

    try {
      await transcriptsAPI.delete(transcriptId)
      await loadTranscripts()
      toast.success("Transcript deleted successfully!")
    } catch (error) {
      console.error('Failed to delete transcript:', error)
      toast.error("Failed to delete transcript. Please try again.")
    }
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Meeting Transcripts</h1>
            <p className="text-gray-600">
              Upload or input your meeting transcripts to automatically generate actionable tasks.
            </p>
          </div>

          {/* Input Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Add New Transcript
              </CardTitle>
              <CardDescription>
                Enter transcript text manually or load a file to edit the content, then generate tasks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="transcript-text" className="block text-sm font-medium text-gray-700 mb-2">
                  Transcript Text
                </label>
                <Textarea
                  id="transcript-text"
                  placeholder="Paste your meeting transcript here..."
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
              </div>

              <div className="flex items-center gap-4">
                <Button onClick={handleGenerateTasks} disabled={isGenerating || !transcriptText.trim()}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Tasks...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Generate Tasks
                    </>
                  )}
                </Button>

                <div className="relative">
                  <input
                    type="file"
                    accept=".txt,.doc,.docx"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <Button variant="outline" disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading File...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Load File
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transcripts List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transcripts</CardTitle>
              <CardDescription>
                View and manage your uploaded transcripts and their generated tasks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading transcripts...</span>
                </div>
              ) : transcripts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No transcripts uploaded yet.</p>
                  <p className="text-sm">Upload your first meeting transcript to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transcripts.map((transcript) => (
                    <div
                      key={transcript.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">{transcript.title}</h3>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {transcript.content.substring(0, 200)}
                            {transcript.content.length > 200 && "..."}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(transcript.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button variant="outline" size="sm" onClick={() => handleDownload(transcript.id)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(transcript.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
