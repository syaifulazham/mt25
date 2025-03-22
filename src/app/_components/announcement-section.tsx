import Link from "next/link";
import { CalendarDays, MapPin, Trophy, Users } from "lucide-react";

// Sample announcement data
const announcements = [
  {
    id: 1,
    title: "Registration Now Open",
    description: "Registration for Techlympics 2025 is now open! Join thousands of tech enthusiasts from across Malaysia.",
    date: "March 15, 2025",
    icon: <Users className="w-10 h-10 text-blue-400" />,
    link: "/register",
    linkText: "Register Now"
  },
  {
    id: 2,
    title: "Venue Announcement",
    description: "Techlympics 2025 will be held at the Kuala Lumpur Convention Centre. Mark your calendars!",
    date: "April 10-12, 2025",
    icon: <MapPin className="w-10 h-10 text-green-400" />,
    link: "#venues",
    linkText: "View Venues"
  },
  {
    id: 3,
    title: "New Prize Categories",
    description: "Exciting new prize categories have been added for Techlympics 2025 with total prizes worth RM 500,000!",
    date: "Announced Feb 28, 2025",
    icon: <Trophy className="w-10 h-10 text-yellow-400" />,
    link: "#prizes",
    linkText: "View Prizes"
  },
  {
    id: 4,
    title: "Important Dates",
    description: "Check out all the important dates for Techlympics 2025 including registration deadlines and event schedules.",
    date: "Updated Weekly",
    icon: <CalendarDays className="w-10 h-10 text-red-400" />,
    link: "#schedule",
    linkText: "View Schedule"
  }
];

export default function AnnouncementSection() {
  return (
    <section className="py-16 bg-gradient-to-b from-black to-gray-900">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-blue-500 to-purple-500">
            Latest Announcements
          </span>
        </h2>
        <p className="text-center text-gray-300 mb-12 max-w-3xl mx-auto">
          Stay updated with the latest news and announcements for Techlympics 2025
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {announcements.map((announcement) => (
            <div 
              key={announcement.id} 
              className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-900/20"
            >
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-full bg-gray-900 flex-shrink-0">
                  {announcement.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-white mb-2">{announcement.title}</h3>
                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
                      {announcement.date}
                    </span>
                  </div>
                  <p className="text-gray-300 mb-4">{announcement.description}</p>
                  <Link 
                    href={announcement.link} 
                    className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium"
                  >
                    {announcement.linkText}
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-10 text-center">
          <Link 
            href="/announcements" 
            className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all text-white font-medium"
          >
            View All Announcements
          </Link>
        </div>
      </div>
    </section>
  );
}
