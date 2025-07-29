"use client"

import type React from "react"

import { useState, useEffect } from "react"
import MainLayout from "@/components/ui/layout/main-layout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { FileText, Upload, Download, Trash2, Loader2, Plus, Calendar, Brain, MessageSquare } from "lucide-react"
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
      // Create the transcript with the current text content
      // This will handle both manual entry and edited file content
      await transcriptsAPI.create({
        title: `Meeting Transcript - ${new Date().toLocaleDateString()}`,
        content: transcriptText,
      })

      // The create route automatically generates tasks, summary, and sentiment
      // No need to call generateTasks separately

      // Reload transcripts to get updated data
      await loadTranscripts()
      setTranscriptText("")

      toast.success(`Transcript processed, Tasks have been generated successfully! Please navigate to your dashboard.`)
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

    // Check file type
    if (!file.name.endsWith('.txt')) {
      toast.error("Only .txt files are supported. Please convert your file to .txt format first.")
      event.target.value = ""
      return
    }

    setIsUploading(true)

    try {
      // Read the file content and show it in the text area for editing
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setTranscriptText(content) // Put the extracted text in the form field for editing
        toast.success("File content loaded! You can now edit it and click 'Create Transcript & Generate Tasks' when ready.")
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
    // Find the transcript to get task count
    const transcript = transcripts.find(t => t.id === transcriptId)
    
    // Custom confirmation dialog with warning about tasks
    const confirmation = confirm(
      `⚠️ DELETE TRANSCRIPT WARNING ⚠️\n\n` +
      `This will permanently delete:\n` +
      `• The transcript: "${transcript?.title || 'Unknown'}"\n` +
      `• ALL TASKS generated from this transcript\n` +
      `• This action CANNOT be undone\n\n` +
      `Are you absolutely sure you want to continue?`
    )
    
    if (!confirmation) {
      return
    }

    try {
      await transcriptsAPI.delete(transcriptId)
      await loadTranscripts()
      toast.success("Transcript and all related tasks deleted successfully!")
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
                Enter transcript text manually or load a file to edit the content, then click &quot;Generate Tasks&quot; to create the transcript and automatically generate AI tasks.
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

              {/* Info box explaining the flow */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start">
                  <Brain className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <strong>How it works:</strong> Type or paste your transcript content above, or click &quot;Load File Content&quot; to extract text from a file. Once you&apos;re happy with the content, click &quot;Create Transcript &amp; Generate Tasks&quot; to save it and automatically generate AI-powered tasks, summary, and sentiment analysis.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button onClick={handleGenerateTasks} disabled={isGenerating || !transcriptText.trim()}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Transcript & Generating Tasks...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Transcript & Generate Tasks
                    </>
                  )}
                </Button>

                <div className="relative">
                  <input
                    type="file"
                    accept=".txt"
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
                        Load File Content
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
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-gray-900">{transcript.title}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {transcript.content.substring(0, 200)}
                            {transcript.content.length > 200 && "..."}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(transcript.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {/* Action Buttons Row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Dialog>
                              <DialogTrigger>
                                <Button variant="outline" size="sm">
                                  <FileText className="h-4 w-4 mr-1" />
                                  View More
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh]">
                                <DialogHeader>
                                  <DialogTitle>{transcript.title}</DialogTitle>
                                  <DialogDescription>
                                    Full transcript content
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="mt-4 max-h-[60vh] overflow-y-auto">
                                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {transcript.content}
                                  </p>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            <Button variant="outline" size="sm" onClick={() => handleDownload(transcript.id)}>
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                            
                            {transcript.sentiment && (
                              <Dialog>
                                <DialogTrigger>
                                  <Button variant="outline" size="sm">
                                    <Brain className="h-4 w-4 mr-1" />
                                    Sentiment
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Sentiment Analysis</DialogTitle>
                                    <DialogDescription>
                                      AI-generated sentiment analysis of the transcript
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="mt-4">
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                      {transcript.sentiment}
                                    </p>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                            
                            {transcript.summary && (
                              <Dialog>
                                <DialogTrigger>
                                  <Button variant="outline" size="sm">
                                    <MessageSquare className="h-4 w-4 mr-1" />
                                    Summary
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Transcript Summary</DialogTitle>
                                    <DialogDescription>
                                      AI-generated summary of the key points
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="mt-4">
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                      {transcript.summary}
                                    </p>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(transcript.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
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
