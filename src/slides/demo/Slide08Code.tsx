import React, { useState } from 'react';
import { MSSlideLayout } from '@/components/slides/MSSlideLayout';
import { ArrowRight, Phone, Mail, Globe, Calendar, Clock, Check, X } from 'lucide-react';

export default function Slide08Code() {
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooked, setIsBooked] = useState(false);

  const dates = ['Mon, Jan 20', 'Tue, Jan 21', 'Wed, Jan 22', 'Thu, Jan 23'];
  const times = ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'];

  const handleBook = () => {
    if (selectedDate && selectedTime) {
      setIsBooked(true);
    }
  };

  return (
    <MSSlideLayout variant="dark">
      <div className="flex flex-col justify-center h-full px-20 py-16">
        {/* Main CTA area */}
        <div className="max-w-3xl">
          <h2 className="text-5xl font-light text-white mb-6 leading-tight">
            Ready to Start Your
            <br />
            <span className="font-semibold">Investment Journey?</span>
          </h2>
          
          <div className="w-24 h-1 bg-ms-blue mb-8" />
          
          <p className="text-xl text-white/80 font-light max-w-2xl leading-relaxed mb-12">
            Connect with a Morgan Stanley Financial Advisor to discuss your 
            goals and create a personalized wealth strategy.
          </p>
          
          {/* CTA Button */}
          {!showBooking ? (
            <button 
              onClick={() => setShowBooking(true)}
              className="inline-flex items-center gap-3 bg-ms-blue text-white px-8 py-4 rounded-sm font-semibold text-lg hover:bg-ms-blue-80 transition-colors"
            >
              Schedule a Consultation
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="bg-white/10 backdrop-blur-sm rounded-sm p-6 max-w-md">
              {isBooked ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-green-400" />
                  </div>
                  <h4 className="text-white font-semibold text-lg mb-2">Consultation Booked!</h4>
                  <p className="text-white/70 text-sm mb-1">{selectedDate} at {selectedTime}</p>
                  <p className="text-white/50 text-xs">A confirmation email will be sent shortly.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-ms-blue" />
                      Select a Date & Time
                    </h4>
                    <button 
                      onClick={() => setShowBooking(false)}
                      className="text-white/50 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {dates.map((date) => (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`p-2 rounded text-sm transition-colors ${
                          selectedDate === date 
                            ? 'bg-ms-blue text-white' 
                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {date}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4 text-white/60 text-xs">
                    <Clock className="w-3 h-3" />
                    <span>Available times</span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {times.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-2 rounded text-xs transition-colors ${
                          selectedTime === time 
                            ? 'bg-ms-blue text-white' 
                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={handleBook}
                    disabled={!selectedDate || !selectedTime}
                    className="w-full py-3 bg-ms-blue text-white rounded-sm font-semibold text-sm hover:bg-ms-blue-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Booking
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Contact info */}
        <div className="absolute bottom-12 left-20 right-20">
          <div className="flex items-center gap-12 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>1-888-454-3965</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>wealth@morganstanley.com</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>morganstanley.com</span>
            </div>
          </div>
        </div>
      </div>
    </MSSlideLayout>
  );
}
