"use client"

import { useState, useEffect } from "react"
import { Clock, Play, Square, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function ClockInOut() {
  const [time, setTime] = useState<Date | null>(null)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState("00:00:00")

  useEffect(() => {
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let interval: any
    if (isClockedIn && startTime) {
      interval = setInterval(() => {
        const diff = new Date().getTime() - startTime.getTime()
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0')
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0')
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0')
        setElapsed(`${h}:${m}:${s}`)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isClockedIn, startTime])

  const handleClockToggle = () => {
    if (isClockedIn) {
      setIsClockedIn(false)
      setStartTime(null)
      setElapsed("00:00:00")
    } else {
      setIsClockedIn(true)
      setStartTime(new Date())
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Attendance
          </CardTitle>
          <Badge variant={isClockedIn ? "default" : "secondary"} className={isClockedIn ? "bg-green-500" : ""}>
            {isClockedIn ? "Clocked In" : "Offline"}
          </Badge>
        </div>
        <CardDescription>Register your working hours for today.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center py-6 gap-6">
        <div className="text-center">
          <p className="text-4xl font-mono font-bold tracking-tighter text-primary">
            {time ? time.toLocaleTimeString([], { hour12: false }) : "00:00:00"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {time ? time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : "Loading..."}
          </p>
        </div>

        {isClockedIn && (
          <div className="bg-white dark:bg-slate-900 rounded-lg p-3 w-full border text-center shadow-sm">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Time Elapsed</p>
            <p className="text-2xl font-mono font-bold text-accent">{elapsed}</p>
          </div>
        )}

        <div className="flex gap-4 w-full">
          <Button 
            onClick={handleClockToggle}
            className={`flex-1 h-12 gap-2 text-lg font-bold ${isClockedIn ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}`}
          >
            {isClockedIn ? (
              <><Square className="h-5 w-5 fill-current" /> Clock Out</>
            ) : (
              <><Play className="h-5 w-5 fill-current" /> Clock In</>
            )}
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>Location tracking enabled</span>
        </div>
      </CardContent>
    </Card>
  )
}