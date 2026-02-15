import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: LucideIcon
  trend?: {
    value: number
    positive: boolean
  }
}

export function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          {trend && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${trend.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {trend.positive ? '+' : '-'}{Math.abs(trend.value)}%
            </span>
          )}
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}