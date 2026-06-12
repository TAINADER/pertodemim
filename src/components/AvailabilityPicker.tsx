export type DaySchedule = { day: string; start: string; end: string };

export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function AvailabilityPicker({ value, onChange }: {
  value: DaySchedule[];
  onChange: (v: DaySchedule[]) => void;
}) {
  const toggleDay = (day: string) => {
    const exists = value.find(d => d.day === day);
    if (exists) {
      onChange(value.filter(d => d.day !== day));
    } else {
      onChange([...value, { day, start: "08:00", end: "17:00" }]);
    }
  };
  const updateTime = (day: string, field: "start" | "end", time: string) => {
    onChange(value.map(d => d.day === day ? { ...d, [field]: time } : d));
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.map(day => {
          const active = value.some(d => d.day === day);
          return (
            <button key={day} type="button" onClick={() => toggleDay(day)}
              className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}>
              {day}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <div className="space-y-2">
          {WEEKDAYS.filter(d => value.some(v => v.day === d)).map(day => {
            const schedule = value.find(d => d.day === day)!;
            return (
              <div key={day} className="flex items-center gap-3 bg-muted/40 px-3 py-2 rounded-lg">
                <span className="text-xs font-bold w-7 text-primary">{day}</span>
                <input type="time" value={schedule.start}
                  onChange={e => updateTime(day, "start", e.target.value)}
                  className="text-xs bg-white border border-border rounded-md px-2 py-1.5 w-[7rem]" />
                <span className="text-xs text-muted-foreground">até</span>
                <input type="time" value={schedule.end}
                  onChange={e => updateTime(day, "end", e.target.value)}
                  className="text-xs bg-white border border-border rounded-md px-2 py-1.5 w-[7rem]" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
