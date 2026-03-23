import { Calendar } from 'lucide-react'

export function CalendarPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Calendar className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="font-display text-2xl font-semibold text-foreground mb-2">
        Calendar
      </h2>
      <p className="text-muted-foreground max-w-sm">
        Interview scheduling is coming soon. Check back later for calendar
        functionality.
      </p>
    </div>
  )
}
