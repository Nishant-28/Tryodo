import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Linkedin, MapPin, Phone, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-black text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="text-3xl font-extrabold text-white">Tryodo</h3>
            <p className="text-gray-400 text-sm">Your trusted marketplace for mobile parts.</p>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="text-gray-400 hover:text-[#00FFCC] transition-colors"><Facebook size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-[#00FFCC] transition-colors"><Instagram size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-[#00FFCC] transition-colors"><Twitter size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-[#00FFCC] transition-colors"><Linkedin size={20} /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
            <ul>
              <li className="mb-2"><Link to="/" className="text-gray-400 text-base hover:text-[#00FFCC] transition-colors">Home</Link></li>
              <li className="mb-2"><Link to="/order" className="text-gray-400 text-base hover:text-[#00FFCC] transition-colors">Order</Link></li>
              <li className="mb-2"><Link to="/about" className="text-gray-400 text-base hover:text-[#00FFCC] transition-colors">About Us</Link></li>
              <li className="mb-2"><Link to="/contact" className="text-gray-400 text-base hover:text-[#00FFCC] transition-colors">Contact</Link></li>
              <li className="mb-2"><Link to="/privacy" className="text-gray-400 text-base hover:text-[#00FFCC] transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Support</h4>
            <ul>
              <li className="mb-2"><a href="#" className="text-gray-400 text-base hover:text-[#00FFCC] transition-colors">FAQ</a></li>
              <li className="mb-2"><a href="#" className="text-gray-400 text-base hover:text-[#00FFCC] transition-colors">Shipping & Returns</a></li>
              <li className="mb-2"><a href="#" className="text-gray-400 text-base hover:text-[#00FFCC] transition-colors">Warranty</a></li>
              <li className="mb-2"><a href="#" className="text-gray-400 text-base hover:text-[#00FFCC] transition-colors">Report a Bug</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Contact Us</h4>
            <p className="text-gray-400 mb-2 flex items-center"><MapPin size={16} className="mr-2" /> 123 Tryodo Street, Tech City, India</p>
            <p className="text-gray-400 mb-2 flex items-center"><Phone size={16} className="mr-2" /> +91 98765 43210</p>
            <p className="text-gray-400 mb-2 flex items-center"><Mail size={16} className="mr-2" /> support@tryodo.com</p>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8 text-center">
          <p className="text-white text-3xl font-extrabold mb-2">TRYODO</p>
          <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 