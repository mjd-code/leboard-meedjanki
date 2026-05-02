import React, { useState } from 'react';
import { SlideLayout } from '@/components/slides/SlideLayout';
import { Calendar, Clock, Video, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
const timeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];
const getDaysInMonth = () => {
  const days: (number | null)[] = [];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  // Add empty slots for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Pad to complete the last week
  while (days.length % 7 !== 0) {
    days.push(null);
  }
  return days;
};
export default function Slide04CalendarBooking() {
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooked, setIsBooked] = useState(false);
  const days = getDaysInMonth();
  const today = new Date().getDate();
  const monthName = new Date().toLocaleString('default', {
    month: 'long',
    year: 'numeric'
  });
  const handleBook = () => {
    if (selectedDate && selectedTime) {
      setIsBooked(true);
    }
  };
  if (isBooked) {
    return <SlideLayout variant="default">
        <div className="flex flex-col justify-center items-center h-full px-20 py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-green-600" strokeWidth={2} />
          </div>
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Demo Booked!
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            {monthName.split(' ')[0]} {selectedDate} at {selectedTime}
          </p>
          <button onClick={() => {
          setIsBooked(false);
          setSelectedDate(null);
          setSelectedTime(null);
        }} className="px-6 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors">
            Book Another
          </button>
        </div>
      </SlideLayout>;
  }
  return <SlideLayout variant="default">
      <div className="flex flex-col h-full px-20 py-16">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[#4E93FF] text-sm font-semibold uppercase tracking-widest mb-2">
            Schedule a Demo
          </p>
          <h2 className="text-4xl font-bold text-slate-900 mb-2">
            ​Forms and booking flows    
          </h2>
          <p className="text-lg text-slate-500 font-light">
            Interactive calendar component — try selecting a date and time
          </p>
        </div>

        {/* Calendar layout */}
        <div className="flex-1 flex gap-8">
          {/* Calendar */}
          <div className="flex-1 bg-white rounded-2xl p-6 border border-slate-200">
            {/* Month header */}
            <div className="flex items-center justify-between mb-6">
              <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <h3 className="text-lg font-semibold text-slate-900">{monthName}</h3>
              <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
                  {day}
                </div>)}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => <button key={index} disabled={day === null || day < today} onClick={() => day && day >= today && setSelectedDate(day)} className={cn("h-12 w-full rounded-lg text-base font-medium transition-all flex items-center justify-center", day === null && "invisible", day !== null && day < today && "text-slate-300 cursor-not-allowed", day !== null && day >= today && "hover:bg-blue-100 text-slate-700 cursor-pointer", day === today && "ring-2 ring-[#4E93FF] ring-offset-2", selectedDate === day && day !== null && "bg-[#4E93FF] text-white hover:bg-[#3A7FE8]")}>
                  {day}
                </button>)}
            </div>
          </div>

          {/* Time slots */}
          <div className="w-64 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Available Times</span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto">
              {timeSlots.map(time => <button key={time} onClick={() => setSelectedTime(time)} disabled={!selectedDate} className={cn("w-full py-3 px-4 rounded-xl text-sm font-medium transition-all", !selectedDate && "bg-slate-100 text-slate-400 cursor-not-allowed", selectedDate && "bg-slate-100 hover:bg-blue-100 text-slate-700", selectedTime === time && "bg-[#4E93FF] text-white hover:bg-[#3A7FE8]")}>
                  {time}
                </button>)}
            </div>

            {/* Book button */}
            <button onClick={handleBook} disabled={!selectedDate || !selectedTime} className={cn("mt-4 w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all", selectedDate && selectedTime ? "bg-[#4E93FF] text-white hover:bg-[#3A7FE8]" : "bg-slate-200 text-slate-400 cursor-not-allowed")}>
              <Video className="w-5 h-5" />
              Confirm Booking
            </button>
          </div>
        </div>
      </div>
    </SlideLayout>;
}