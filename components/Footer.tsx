"use client";

import Link from "next/link";
import { Leaf, MessageCircle, Send, Camera, Video } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-text text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Leaf className="w-6 h-6 text-primary" />
              <span className="font-bold text-xl tracking-tight">
                Michael Gad Math
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Empowering students to achieve excellence in mathematics through expert guidance and comprehensive online resources.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                <MessageCircle className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                <Send className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                <Camera className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                <Video className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-6">Quick Links</h3>
            <ul className="space-y-3">
              <li><Link href="/" className="text-gray-400 hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/about" className="text-gray-400 hover:text-primary transition-colors">About Michael Gad</Link></li>
              <li><Link href="/courses" className="text-gray-400 hover:text-primary transition-colors">All Courses</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-primary transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-6">Help & Support</h3>
            <ul className="space-y-3">
              <li><Link href="/faq" className="text-gray-400 hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/login" className="text-gray-400 hover:text-primary transition-colors">Student Login</Link></li>
              <li><Link href="/parent-login" className="text-gray-400 hover:text-primary transition-colors">Parent Portal</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-6">Newsletter</h3>
            <p className="text-gray-400 text-sm mb-4">Subscribe to get the latest updates and study tips.</p>
            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Your email address" 
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary text-white"
                required
              />
              <button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm text-center md:text-left">
            © {new Date().getFullYear()} Michael Gad Math Academy. All rights reserved.
          </p>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <span className="text-gray-500 text-sm">Powered by</span>
            <span className="text-gray-400 font-semibold text-sm">True Learning</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
