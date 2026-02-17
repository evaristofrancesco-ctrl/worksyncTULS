
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
    <Card className="overflow-hidden border-none shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
            <h3 className="text-xl font-black mt-0.5 text-[#1e293b]">{value}</h3>
          </div>
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {trend && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${trend.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {trend.positive ? '+' : '-'}{Math.abs(trend.value)}%
            </span>
          )}
          <p className="text-[10px] text-muted-foreground font-medium">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
