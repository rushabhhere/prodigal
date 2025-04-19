"use client"

import { useEffect, useRef, useState } from "react"

interface ConversationSegment {
  speaker: string
  text: string
  stime: number
  etime: number
}

interface TimelineSegment {
  type: "agent" | "customer" | "silence" | "overlap"
  startTime: number
  endTime: number
  text?: string
  speakers?: string[]
}

interface ConversationStats {
  totalDuration: number
  silenceDuration: number
  overlapDuration: number
  agentDuration: number
  customerDuration: number
  silencePercentage: number
  overlapPercentage: number
  agentPercentage: number
  customerPercentage: number
}

interface ConversationVisualizerProps {
  data: ConversationSegment[]
}

export default function ConversationVisualizer({ data }: ConversationVisualizerProps) {
  const [segments, setSegments] = useState<TimelineSegment[]>([])
  const [duration, setDuration] = useState(0)
  const [stats, setStats] = useState<ConversationStats | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth)

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width)
        }
      })

      resizeObserver.observe(containerRef.current)
      return () => resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!data || data.length === 0) return

    // Find the total duration of the conversation
    const maxTime = Math.max(...data.map((segment) => segment.etime))
    setDuration(maxTime)

    // Create a timeline of all events (start and end of each segment)
    const events: { time: number; isStart: boolean; segment: ConversationSegment }[] = []

    data.forEach((segment) => {
      events.push({ time: segment.stime, isStart: true, segment })
      events.push({ time: segment.etime, isStart: false, segment })
    })

    // Sort events by time
    events.sort((a, b) => a.time - b.time)

    // Process events to create timeline segments
    const timelineSegments: TimelineSegment[] = []
    const activeSpeakers = new Map<string, ConversationSegment>()
    let lastTime = 0

    events.forEach((event) => {
      const { time, isStart, segment } = event

      // If there's a gap between the last event and this one, add a silence segment
      if (time > lastTime && activeSpeakers.size === 0) {
        timelineSegments.push({
          type: "silence",
          startTime: lastTime,
          endTime: time,
        })
      }

      // If there are active speakers, create a segment for the current state
      if (time > lastTime && activeSpeakers.size > 0) {
        const speakers = Array.from(activeSpeakers.values())
        const speakerTypes = new Set(speakers.map((s) => s.speaker))

        if (speakers.length === 1) {
          // Single speaker segment
          const speaker = speakers[0]
          timelineSegments.push({
            type: speaker.speaker.toLowerCase().includes("agent") ? "agent" : "customer",
            startTime: lastTime,
            endTime: time,
            text: speaker.text,
            speakers: [speaker.speaker],
          })
        } else {
          // Overlap segment
          timelineSegments.push({
            type: "overlap",
            startTime: lastTime,
            endTime: time,
            speakers: speakers.map((s) => s.speaker),
          })
        }
      }

      // Update active speakers
      if (isStart) {
        activeSpeakers.set(segment.speaker, segment)
      } else {
        activeSpeakers.delete(segment.speaker)
      }

      lastTime = time
    })

    setSegments(timelineSegments)
  }, [data])

  useEffect(() => {
    if (segments.length === 0 || duration === 0) return

    let silenceDuration = 0
    let overlapDuration = 0
    let agentDuration = 0
    let customerDuration = 0

    segments.forEach((segment) => {
      const segmentDuration = segment.endTime - segment.startTime

      switch (segment.type) {
        case "silence":
          silenceDuration += segmentDuration
          break
        case "overlap":
          overlapDuration += segmentDuration
          break
        case "agent":
          agentDuration += segmentDuration
          break
        case "customer":
          customerDuration += segmentDuration
          break
      }
    })

    setStats({
      totalDuration: duration,
      silenceDuration,
      overlapDuration,
      agentDuration,
      customerDuration,
      silencePercentage: (silenceDuration / duration) * 100,
      overlapPercentage: (overlapDuration / duration) * 100,
      agentPercentage: (agentDuration / duration) * 100,
      customerPercentage: (customerDuration / duration) * 100,
    })
  }, [segments, duration])

  const getSegmentWidth = (startTime: number, endTime: number) => {
    if (duration === 0) return 0
    return ((endTime - startTime) / duration) * 100
  }

  const getSegmentColor = (type: string) => {
    switch (type) {
      case "agent":
        return "bg-yellow-200"
      case "customer":
        return "bg-green-200"
      case "silence":
        return "bg-gray-200"
      case "overlap":
        return "bg-red-200"
      default:
        return "bg-gray-100"
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-6">
      <div ref={containerRef} className="w-full">
        {/* Timeline visualization */}
        <div className="relative h-16 border rounded-md overflow-hidden">
          {segments.map((segment, index) => (
            <div
              key={index}
              className={`absolute h-full ${getSegmentColor(segment.type)} hover:opacity-90 transition-opacity flex items-center justify-center border-r border-white/20`}
              style={{
                left: `${(segment.startTime / duration) * 100}%`,
                width: `${getSegmentWidth(segment.startTime, segment.endTime)}%`,
              }}
              title={`${segment.type.charAt(0).toUpperCase() + segment.type.slice(1)}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
            >
              {segment.type !== "silence" && getSegmentWidth(segment.startTime, segment.endTime) > 5 && (
                <span className="text-xs font-medium truncate px-1">
                  {segment.type === "overlap"
                    ? "Overlap"
                    : segment.type.charAt(0).toUpperCase() + segment.type.slice(1)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Time markers */}
        <div className="relative h-6 mt-1">
          {Array.from({ length: Math.min(11, duration + 1) }).map((_, i) => {
            const time = i * (duration / 10)
            return (
              <div
                key={i}
                className="absolute transform -translate-x-1/2"
                style={{ left: `${(time / duration) * 100}%` }}
              >
                <div className="h-2 w-px bg-gray-400 mx-auto"></div>
                <div className="text-xs text-gray-500">{formatTime(time)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-200 mr-2"></div>
          <span className="text-sm">Agent</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-200 mr-2"></div>
          <span className="text-sm">Customer</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-200 mr-2"></div>
          <span className="text-sm">Silence</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-200 mr-2"></div>
          <span className="text-sm">Overlap</span>
        </div>
      </div>

      {/* Detailed segments list */}
      <div className="space-y-2 mt-6">
        <h3 className="font-medium">Conversation Segments</h3>
        <div className="space-y-2">
          {segments.map((segment, index) => (
            <div key={index} className={`p-3 rounded-md ${getSegmentColor(segment.type)}`}>
              <div className="flex justify-between text-sm font-medium">
                <span>
                  {segment.type.charAt(0).toUpperCase() + segment.type.slice(1)}
                  {segment.speakers && segment.speakers.length > 0 && `: ${segment.speakers.join(", ")}`}
                </span>
                <span>
                  {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                </span>
              </div>
              {segment.text && <p className="mt-1 text-sm">{segment.text}</p>}
            </div>
          ))}
        </div>
      </div>
      {stats && (
        <div className="mt-8 border rounded-lg p-4 bg-white">
          <h3 className="font-medium text-lg mb-4">Conversation Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Time Distribution</h4>
                <div className="w-full h-8 rounded-md overflow-hidden flex">
                  <div
                    className="bg-yellow-200 h-full"
                    style={{ width: `${stats.agentPercentage}%` }}
                    title={`Agent: ${stats.agentPercentage.toFixed(1)}%`}
                  ></div>
                  <div
                    className="bg-green-200 h-full"
                    style={{ width: `${stats.customerPercentage}%` }}
                    title={`Customer: ${stats.customerPercentage.toFixed(1)}%`}
                  ></div>
                  <div
                    className="bg-gray-200 h-full"
                    style={{ width: `${stats.silencePercentage}%` }}
                    title={`Silence: ${stats.silencePercentage.toFixed(1)}%`}
                  ></div>
                  <div
                    className="bg-red-200 h-full"
                    style={{ width: `${stats.overlapPercentage}%` }}
                    title={`Overlap: ${stats.overlapPercentage.toFixed(1)}%`}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-md p-3">
                  <div className="text-sm text-muted-foreground">Silence</div>
                  <div className="flex items-end gap-2">
                    <div className="text-2xl font-bold">{stats.silencePercentage.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">({formatTime(stats.silenceDuration)})</div>
                  </div>
                </div>

                <div className="border rounded-md p-3">
                  <div className="text-sm text-muted-foreground">Overlap</div>
                  <div className="flex items-end gap-2">
                    <div className="text-2xl font-bold">{stats.overlapPercentage.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">({formatTime(stats.overlapDuration)})</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border rounded-md p-3">
                <div className="text-sm text-muted-foreground">Total Duration</div>
                <div className="text-2xl font-bold">{formatTime(stats.totalDuration)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-md p-3">
                  <div className="text-sm text-muted-foreground">Agent Talk Time</div>
                  <div className="flex items-end gap-2">
                    <div className="text-2xl font-bold">{stats.agentPercentage.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">({formatTime(stats.agentDuration)})</div>
                  </div>
                </div>

                <div className="border rounded-md p-3">
                  <div className="text-sm text-muted-foreground">Customer Talk Time</div>
                  <div className="flex items-end gap-2">
                    <div className="text-2xl font-bold">{stats.customerPercentage.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">({formatTime(stats.customerDuration)})</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
