import React from 'react';

const Contact = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
    <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Contact Us</h1>
      <form>
        <input type="text" placeholder="Your Name" className="w-full p-2 mb-4 border rounded" />
        <input type="email" placeholder="Your Email" className="w-full p-2 mb-4 border rounded" />
        <textarea placeholder="Your Message" className="w-full p-2 mb-4 border rounded" rows={4}></textarea>
        <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded">Send</button>
      </form>
    </div>
  </div>
);

export default Contact; 