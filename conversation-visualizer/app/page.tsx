"use client"

import type React from "react"

import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileCode } from "lucide-react"
import ConversationVisualizer from "@/components/conversation-visualizer"
import { exampleData } from "@/components/example-data"

interface ConversationSegment {
  speaker: string
  text: string
  stime: number
  etime: number
}

export default function Home() {
  const [jsonData, setJsonData] = useState<ConversationSegment[]>([])
  const [jsonInput, setJsonInput] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleJsonInput = () => {
    try {
      const parsed = JSON.parse(jsonInput)
      if (!Array.isArray(parsed)) {
        throw new Error("Input must be an array of conversation segments")
      }

      // Validate each segment
      for (const segment of parsed) {
        if (
          !segment.speaker ||
          typeof segment.stime !== "number" ||
          typeof segment.etime !== "number" ||
          !segment.text
        ) {
          throw new Error("Each segment must have speaker, text, stime, and etime properties")
        }
      }

      setJsonData(parsed)
      setError(null)
    } catch (err) {
      setError(`Invalid JSON: ${err instanceof Error ? err.message : "Unknown error"}`)
      setJsonData([])
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        setJsonInput(content)
        const parsed = JSON.parse(content)
        if (!Array.isArray(parsed)) {
          throw new Error("Input must be an array of conversation segments")
        }

        // Validate each segment
        for (const segment of parsed) {
          if (
            !segment.speaker ||
            typeof segment.stime !== "number" ||
            typeof segment.etime !== "number" ||
            !segment.text
          ) {
            throw new Error("Each segment must have speaker, text, stime, and etime properties")
          }
        }

        setJsonData(parsed)
      } catch (err) {
        setError(`Invalid JSON file: ${err instanceof Error ? err.message : "Unknown error"}`)
        setJsonData([])
      }
    }
    reader.readAsText(file)
  }

  const loadExampleData = () => {
    const exampleJson = JSON.stringify(exampleData, null, 2)
    setJsonInput(exampleJson)
    setJsonData(exampleData)
    setError(null)
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Conversation Visualizer</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Input Conversation Data</CardTitle>
          <CardDescription>Upload a JSON file or paste JSON data in the format shown below</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Textarea
              placeholder={`[
  {
    "speaker": "Customer",
    "text": "You have reached the voicemail of John Smith...",
    "stime": 0,
    "etime": 8
  },
  ...
]`}
              className="min-h-[200px] font-mono text-sm"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />

            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleJsonInput}>Visualize</Button>

              <div className="relative">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload JSON File
                </Button>
                <input
                  type="file"
                  accept=".json"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                />
              </div>

              <Button variant="outline" onClick={loadExampleData}>
                <FileCode className="mr-2 h-4 w-4" />
                Load Example Data
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {jsonData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversation Visualization</CardTitle>
            <CardDescription>Timeline showing speech, silence, and overlaps</CardDescription>
          </CardHeader>
          <CardContent>
            <ConversationVisualizer data={jsonData} />
          </CardContent>
        </Card>
      )}
    </main>
  )
}
