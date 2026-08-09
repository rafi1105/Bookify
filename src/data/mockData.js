// Mock Data for Bookify Platform

export const POPULAR_ROUTES = [
  {
    id: "route-1",
    from: "New York, NY",
    to: "Boston, MA",
    duration: "4h 15m",
    distance: "215 miles",
    price: 34.99,
    rating: 4.9,
    tripsPerDay: 28,
    imageName: "scenic-route.jpg",
    tags: ["High Speed", "Luxury Sleeper", "Wi-Fi 6", "Power Ports"],
    operator: "Bookify Premier Express"
  },
  {
    id: "route-2",
    from: "Los Angeles, CA",
    to: "Las Vegas, NV",
    duration: "4h 45m",
    distance: "270 miles",
    price: 39.50,
    rating: 4.8,
    tripsPerDay: 32,
    imageName: "city-metropolis.jpg",
    tags: ["Ultra VIP", "Night Sleeper", "Free Snacks", "Recliner"],
    operator: "Gold Coast Liners"
  },
  {
    id: "route-3",
    from: "Miami, FL",
    to: "Orlando, FL",
    duration: "3h 30m",
    distance: "235 miles",
    price: 28.99,
    rating: 4.95,
    tripsPerDay: 24,
    imageName: "passenger-exp.jpg",
    tags: ["Panoramic Deck", "Live GPS", "AC Sleeper"],
    operator: "SunState Express"
  },
  {
    id: "route-4",
    from: "Chicago, IL",
    to: "Detroit, MI",
    duration: "5h 10m",
    distance: "280 miles",
    price: 42.00,
    rating: 4.75,
    tripsPerDay: 18,
    imageName: "hero-bus.jpg",
    tags: ["Executive Pods", "Extra Legroom", "Silent Ride"],
    operator: "Midwest Horizon"
  },
  {
    id: "route-5",
    from: "Seattle, WA",
    to: "Portland, OR",
    duration: "3h 15m",
    distance: "173 miles",
    price: 26.50,
    rating: 4.9,
    tripsPerDay: 22,
    imageName: "scenic-route.jpg",
    tags: ["Eco-Hybrid Bus", "Pet Friendly", "Instant Refund"],
    operator: "Pacific Shuttle"
  },
  {
    id: "route-6",
    from: "Washington, DC",
    to: "Philadelphia, PA",
    duration: "2h 45m",
    distance: "139 miles",
    price: 24.99,
    rating: 4.85,
    tripsPerDay: 36,
    imageName: "city-metropolis.jpg",
    tags: ["Frequent Runner", "Business Class", "USB-C"],
    operator: "Capitol Transit"
  }
];

export const BUS_TYPES = [
  {
    id: "sleeper",
    name: "Bookify Pod-Sleeper (Volvo B11R)",
    category: "Ultra Luxury Sleeper",
    seatsCount: 30,
    deck: "Double Deck (15 Upper / 15 Lower)",
    features: ["Fully Flat Beds", "Privacy Curtains", "4K Touchscreen", "Personal Reading Light", "Restroom Onboard"],
    basePrice: 48.00,
    image: "sleeper-bus.jpg"
  },
  {
    id: "executive",
    name: "Scania Multi-Axle VIP Seater",
    category: "Executive Seater (2+1 Layout)",
    seatsCount: 36,
    deck: "Single High Deck",
    features: ["140° Recline Seats", "Calf Support", "Fast Wi-Fi", "USB Charging", "Mineral Water"],
    basePrice: 35.00,
    image: "seater-bus.jpg"
  },
  {
    id: "express",
    name: "Mercedes-Benz Super Coach",
    category: "Express Comfort (2+2)",
    seatsCount: 44,
    deck: "Single Deck",
    features: ["Air Suspension", "Ergonomic Seats", "Live GPS", "Overhead Storage"],
    basePrice: 28.00,
    image: "hero-bus.jpg"
  }
];

export const MOCK_BUSES = [
  {
    id: "bus-101",
    name: "Bookify Royale Sleeper #802",
    operator: "Bookify Official Fleet",
    busType: "Pod-Sleeper (Volvo B11R)",
    departureTime: "07:30 AM",
    arrivalTime: "11:45 AM",
    duration: "4h 15m",
    from: "New York, NY",
    to: "Boston, MA",
    boardingPoints: ["South Station Terminal A", "Midtown Transit Hub (07:15 AM)"],
    droppingPoints: ["Boston Logan Express Hub", "Copley Square Terminal"],
    price: 49.99,
    rating: 4.9,
    reviewsCount: 342,
    availableSeats: 14,
    totalSeats: 30,
    amenities: ["Wi-Fi", "Restroom", "Sleeper Pod", "Power Outlet", "Live GPS"],
    image: "sleeper-bus.jpg"
  },
  {
    id: "bus-102",
    name: "Scania VIP Express #409",
    operator: "Gold Coast Liners",
    busType: "Executive VIP Seater (2+1)",
    departureTime: "09:00 AM",
    arrivalTime: "01:15 PM",
    duration: "4h 15m",
    from: "New York, NY",
    to: "Boston, MA",
    boardingPoints: ["Port Authority Gate 24", "Queens Plaza Depot"],
    droppingPoints: ["South Station Gate 12"],
    price: 36.50,
    rating: 4.8,
    reviewsCount: 189,
    availableSeats: 21,
    totalSeats: 36,
    amenities: ["Wi-Fi", "Reclining Seats", "Snacks", "USB Charger"],
    image: "seater-bus.jpg"
  },
  {
    id: "bus-103",
    name: "Mercedes Super High Deck #118",
    operator: "SunState Express",
    busType: "Express Comfort (2+2)",
    departureTime: "01:30 PM",
    arrivalTime: "05:45 PM",
    duration: "4h 15m",
    from: "New York, NY",
    to: "Boston, MA",
    boardingPoints: ["Port Authority Gate 18"],
    droppingPoints: ["Boston Downtown Hub"],
    price: 29.99,
    rating: 4.7,
    reviewsCount: 245,
    availableSeats: 8,
    totalSeats: 44,
    amenities: ["Wi-Fi", "Air Conditioning", "Live GPS"],
    image: "hero-bus.jpg"
  },
  {
    id: "bus-104",
    name: "Bookify Night Pod Sleeper #905",
    operator: "Bookify Official Fleet",
    busType: "Pod-Sleeper (Volvo B11R)",
    departureTime: "11:15 PM",
    arrivalTime: "03:30 AM",
    duration: "4h 15m",
    from: "New York, NY",
    to: "Boston, MA",
    boardingPoints: ["Midtown Transit Hub (11:00 PM)"],
    droppingPoints: ["Boston Logan Express Hub"],
    price: 54.00,
    rating: 4.95,
    reviewsCount: 412,
    availableSeats: 6,
    totalSeats: 30,
    amenities: ["Wi-Fi", "Restroom", "Full Flat Sleeper", "Free Blanket & Pillow", "Reading Light"],
    image: "sleeper-bus.jpg"
  }
];

export const SAAS_PLANS = [
  {
    name: "Starter Operator",
    price: "$99",
    period: "/month",
    description: "Ideal for local bus owners running 1 to 5 active routes.",
    features: [
      "Up to 5 Active Buses",
      "Standard Seat Reservation UI",
      "Live GPS Dispatch Map",
      "Email & SMS Passenger Alerts",
      "Standard Payouts (24 Hours)",
      "2% Booking Commission Fee"
    ],
    highlight: false,
    cta: "Start 14-Day Free Trial"
  },
  {
    name: "Pro Marketplace",
    price: "$299",
    period: "/month",
    description: "For scaling bus operators seeking max direct bookings & zero downtime.",
    features: [
      "Up to 25 Active Buses",
      "Custom Branded E-Tickets",
      "Advanced 3D Seat Map Engine",
      "Dynamic Surge Fare Pricing",
      "Instant Direct Bank Payouts",
      "Priority 24/7 Phone Support",
      "1% Reduced Commission Fee"
    ],
    highlight: true,
    badge: "Most Popular",
    cta: "Launch Pro Fleet"
  },
  {
    name: "Enterprise Fleet",
    price: "$699",
    period: "/month",
    description: "Custom multi-region SaaS solution for national transit corporations.",
    features: [
      "Unlimited Buses & Drivers",
      "Dedicated White-Label iOS/Android Apps",
      "Custom API & ERP Integrations",
      "AI Passenger Demand Forecasting",
      "0% Commission (Flat SaaS Fee)",
      "SLA 99.99% Uptime Guarantee"
    ],
    highlight: false,
    cta: "Contact Enterprise Sales"
  }
];

export const TESTIMONIALS = [
  {
    name: "Sarah Jenkins",
    role: "Frequent Traveler (NYC - Boston)",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    text: "Bookify completely redefined bus travel for me. The double-decker sleeper pod felt like a 5-star hotel room on wheels! The live GPS tracking is so accurate.",
    rating: 5,
    verified: true
  },
  {
    name: "David Sterling",
    role: "Fleet Director, TransEast Liners",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    text: "As an operator listing on Bookify, our seat occupancy jumped by 42% in 60 days. The SaaS dashboard and instant payouts make running 18 buses effortless.",
    rating: 5,
    verified: true
  },
  {
    name: "Elena Rostova",
    role: "Digital Nomad & Designer",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
    text: "The seat map picking experience is smooth and beautiful! I booked my sleeper pod from my phone in 30 seconds and got a crisp digital QR pass right away.",
    rating: 5,
    verified: true
  }
];
