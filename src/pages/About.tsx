import React from 'react';

const About = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
    <div className="max-w-2xl text-center">
      <h1 className="text-3xl font-bold mb-4">About Us</h1>
      <p className="text-gray-700 mb-6">
        We are a dynamic team dedicated to building innovative web solutions. Our mission is to provide seamless user experiences through modern technology.
      </p>
      <p className="text-gray-700">
        Get in touch or explore more on our <a href="/contact" className="text-blue-500 underline">Contact</a> page.
      </p>
    </div>
  </div>
);

export default About; 