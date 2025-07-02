# Tryodo-Website Project Overview

This document provides a comprehensive overview of the Tryodo-Website project, detailing its purpose, technology stack, architectural design, and key features.

## 1. Introduction

The Tryodo-Website is a modern web application designed to facilitate [**Insert primary purpose of the website here, e.g., e-commerce, service marketplace, etc.**]. It aims to provide a seamless and intuitive experience for various user profiles, including customers, vendors, and administrators.

## 2. Technology Stack

The project leverages a robust and scalable technology stack:

### Frontend
*   **React**: A declarative, component-based JavaScript library for building user interfaces.
*   **Vite**: A next-generation frontend tooling that provides an extremely fast development experience.
*   **TypeScript**: A superset of JavaScript that adds static typing, enhancing code quality and maintainability.
*   **Tailwind CSS**: A utility-first CSS framework for rapidly building custom designs.
*   **Radix UI**: A collection of unstyled, accessible UI components for building high-quality design systems.
*   **Framer Motion**: A production-ready motion library for React, enabling fluid animations.
*   **React Router DOM**: For declarative routing within the single-page application.
*   **Zod & React Hook Form**: Used together for robust form validation and management.
*   **TanStack Query**: For efficient data fetching, caching, synchronization, and managing server state.

### Backend & Database
*   **Supabase**: An open-source Firebase alternative providing:
    *   **PostgreSQL Database**: A powerful, open-source relational database.
    *   **Supabase Auth**: Secure user authentication and authorization.
    *   **Supabase Realtime**: Realtime subscriptions to database changes.
    *   **Supabase Edge Functions**: Server-side logic deployed globally at the edge.
    *   **Supabase Storage**: Scalable storage for user-generated content (e.g., images).
*   **Firebase Messaging (@firebase/messaging)**: Integrated for push notification capabilities.

## 3. Project Structure

The project follows a standard modern web application structure:

*   `src/`: Contains all source code for the React application.
    *   `assets/`: Static assets like images.
    *   `components/`: Reusable React components (e.g., `Cart.tsx`, `VendorSalesSection.tsx`).
    *   `contexts/`: React Context API for global state management (e.g., `AuthContext.tsx`).
    *   `hooks/`: Custom React hooks for reusable logic.
    *   `lib/`: Utility functions and third-party integrations (e.g., `supabase.ts`, `api.ts`).
    *   `pages/`: Top-level components representing different application views (e.g., `AdminDashboard.tsx`, `Checkout.tsx`).
    *   `styles/`: Global styles or Tailwind CSS configurations.
*   `public/`: Publicly accessible static files.
*   `supabase/`: Supabase-specific configurations, migrations, and functions.
*   `vite.config.ts`: Vite build configuration.
*   `tailwind.config.ts`: Tailwind CSS configuration.
*   `package.json`: Project dependencies and scripts.
*   `.env`: Environment variables for sensitive information (e.g., Supabase API keys).

## 4. Database Structure

The Supabase PostgreSQL database is central to the application's data management. Key tables include (but are not limited to):

*   **`users`**: Stores user authentication details and profile information.
*   **`profiles`**: Extends user information with specific roles (customer, vendor, admin) and additional attributes.
*   **`products`**: Contains details about items available for sale, including `qualityName`, `brandName`, and `modelName`.
*   **`vendors`**: Information about registered vendors, including business details and commission rules.
*   **`orders`**: Records customer purchase orders.
*   **`order_items`**: Details of individual items within an order, linking to products and capturing specifics like quantity and price at the time of purchase.
*   **`quality_categories`**: Defines different quality grades for products (e.g., "Original", "Grade A").
*   **`categories`**: Product categories for organization and filtering.
*   **`reviews`**: User reviews and ratings for products or vendors.
*   **`cart_items`**: Temporary storage for items in a user's shopping cart.

*(A more detailed schema with column types and relationships will be provided in a separate "Project Paper" document.)*

## 5. Backend Architecture

The backend primarily relies on Supabase's managed services:

*   **Authentication**: Handled by Supabase Auth, supporting various sign-in methods and managing user sessions.
*   **Database Operations**: Frontend interacts directly with the PostgreSQL database via the Supabase client library, leveraging Row Level Security (RLS) for secure data access.
*   **Edge Functions**: Used for specific server-side logic, such as webhook handlers, data processing, or integrations that require elevated privileges or complex computations.
*   **Storage**: Supabase Storage is used for managing product images, user avatars, and other file uploads, with configurable access policies.

## 6. Frontend Architecture

The React application is structured around components and pages, utilizing React Router for navigation.

*   **User Profiles**: The application supports distinct user experiences for:
    *   **Customers**: Browsing products, adding to cart, checkout, viewing order history.
    *   **Vendors**: Managing products, viewing sales, updating profile information.
    *   **Administrators**: Overall site management, user management, order oversight, content moderation.
*   **Data Flow**: Data is fetched and managed using TanStack Query, ensuring efficient caching and real-time updates where necessary.
*   **UI/UX**: Built with Tailwind CSS for rapid styling and Radix UI for accessible, high-quality interactive components, ensuring a consistent and responsive user experience across devices.
*   **Key Features**:
    *   **Product Catalog**: Displaying a wide range of products with detailed information.
    *   **Shopping Cart & Checkout**: Streamlined process with clear display of vendor and product quality information.
    *   **User Dashboards**: Personalized dashboards for customers, vendors, and administrators to manage their respective activities.
    *   **Search & Filtering**: Comprehensive search and filtering options for products.

## 7. Key Features and Functionality

*   **Product Management**: Vendors can add, update, and manage their product listings.
*   **Order Processing**: End-to-end order flow from cart to checkout, including order tracking.
*   **User Authentication & Authorization**: Secure sign-up, login, and role-based access control.
*   **Quality & Vendor Transparency**: Clear display of product quality grades and vendor information throughout the shopping process.
*   **Notifications**: Integration with Firebase Messaging for relevant user notifications.
*   **Responsive Design**: Optimized for seamless experience across desktop and mobile devices.

## 8. Conclusion

The Tryodo-Website project is a robust, full-stack application built with modern web technologies to provide a comprehensive [**reiterate primary purpose**] platform. Its modular architecture and clear separation of concerns ensure maintainability and scalability for future enhancements.