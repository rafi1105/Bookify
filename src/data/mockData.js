// Mock Data for Bookify Platform (Bangladesh Luxury Intercity Bus Network)

export const POPULAR_ROUTES = [
  {
    id: "route-1",
    from: "Dhaka",
    to: "Chattogram",
    duration: "5h 30m",
    distance: "248 km",
    price: 1600,
    rating: 4.9,
    tripsPerDay: 48,
    imageName: "scenic-route.jpg",
    tags: ["Scania Double Decker", "Highway Express", "Wi-Fi 6", "Snacks Included"],
    operator: "Green Line Paribahan"
  },
  {
    id: "route-2",
    from: "Dhaka",
    to: "Cox's Bazar",
    duration: "9h 15m",
    distance: "395 km",
    price: 2200,
    rating: 4.95,
    tripsPerDay: 36,
    imageName: "city-metropolis.jpg",
    tags: ["VIP Sleeper Pod", "Direct Beach Express", "140° Recliner", "Mineral Water"],
    operator: "Shohagh Paribahan"
  },
  {
    id: "route-3",
    from: "Dhaka",
    to: "Sylhet",
    duration: "5h 45m",
    distance: "240 km",
    price: 1250,
    rating: 4.85,
    tripsPerDay: 32,
    imageName: "passenger-exp.jpg",
    tags: ["MAN Lion's Coach", "Tea Garden Route", "Live GPS", "USB-C"],
    operator: "London Express"
  },
  {
    id: "route-4",
    from: "Dhaka",
    to: "Rajshahi",
    duration: "5h 00m",
    distance: "256 km",
    price: 1150,
    rating: 4.8,
    tripsPerDay: 24,
    imageName: "hero-bus.jpg",
    tags: ["Bangabandhu Bridge Exp", "VIP Business 2+1", "Comfort Ride"],
    operator: "Desh Travels"
  },
  {
    id: "route-5",
    from: "Dhaka",
    to: "Barishal",
    duration: "3h 45m",
    distance: "185 km",
    price: 950,
    rating: 4.9,
    tripsPerDay: 28,
    imageName: "scenic-route.jpg",
    tags: ["Padma Expressway", "High Speed AC", "Instant Boarding"],
    operator: "Sakura Paribahan"
  },
  {
    id: "route-6",
    from: "Dhaka",
    to: "Khulna",
    duration: "4h 30m",
    distance: "220 km",
    price: 1100,
    rating: 4.85,
    tripsPerDay: 26,
    imageName: "city-metropolis.jpg",
    tags: ["Padma Bridge Route", "Volvo B11R", "Live GPS", "Spacious Seats"],
    operator: "Hanif Enterprise"
  }
];

export const BUS_TYPES = [
  {
    id: "sleeper",
    name: "Green Line Scania Multi-Axle Double Decker",
    category: "Ultra Luxury Sleeper Pod (Euro 6)",
    seatsCount: 36,
    deck: "Double Deck (18 Upper Sleeper / 18 Lower VIP)",
    features: ["Fully Flat Sleeper Pods", "Privacy Curtains", "4K Personal Touchscreen", "Reading Lamp & USB", "Restroom Onboard"],
    basePrice: 1800,
    image: "sleeper-bus.jpg"
  },
  {
    id: "executive",
    name: "Shohagh Scania Elite VIP (1+2 Business Class)",
    category: "Executive Business Seater (2+1 Layout)",
    seatsCount: 30,
    deck: "Single High Deck",
    features: ["140° Calf-Rest Recliner", "Generous Extra Legroom", "High-Speed Wi-Fi", "Mineral Water & Light Snacks", "Live GPS Tracking"],
    basePrice: 1500,
    image: "seater-bus.jpg"
  },
  {
    id: "express",
    name: "London Express MAN Lion's Coach",
    category: "Express Deluxe AC (2+2)",
    seatsCount: 40,
    deck: "Single Aerodynamic Deck",
    features: ["Air Suspension Ride", "Ergonomic Headrest", "Live Satellite Telematics", "Spacious Overhead Storage"],
    basePrice: 1100,
    image: "hero-bus.jpg"
  }
];

export const MOCK_BUSES = [
  {
    id: "bus-101",
    name: "Green Line Scania Double Decker #GL-701",
    operator: "Green Line Paribahan",
    busType: "Scania Multi-Axle Double Decker (VIP Sleeper)",
    departureTime: "07:30 AM",
    arrivalTime: "01:00 PM",
    duration: "5h 30m",
    from: "Dhaka",
    to: "Chattogram",
    boardingPoints: ["Sayedabad Green Line Central Terminal (07:00 AM)", "Arambagh Depot (07:30 AM)", "Panthapath VIP Counter (06:45 AM)"],
    droppingPoints: ["Dampara Bus Station, Chattogram", "AK Khan Bus Point", "GEC Circle Concourse"],
    price: 1600,
    rating: 4.9,
    reviewsCount: 520,
    availableSeats: 14,
    totalSeats: 36,
    amenities: ["Wi-Fi", "Air Conditioning", "Sleeper Pod", "Snacks & Mineral Water", "Live GPS"],
    image: "sleeper-bus.jpg"
  },
  {
    id: "bus-102",
    name: "Shohagh Scania Elite VIP #SH-904",
    operator: "Shohagh Paribahan",
    busType: "Scania Multi-Axle Exclusive 1+2 Seater",
    departureTime: "10:30 PM",
    arrivalTime: "07:15 AM",
    duration: "8h 45m",
    from: "Dhaka",
    to: "Cox's Bazar",
    boardingPoints: ["Panthapath VIP Counter (10:00 PM)", "Arambagh Central Depot (10:30 PM)", "Sayedabad Concourse (11:00 PM)"],
    droppingPoints: ["Kolatoli Beach Terminal, Cox's Bazar", "Dolphin Mor Terminal", "Sugandha Point"],
    price: 2200,
    rating: 4.95,
    reviewsCount: 480,
    availableSeats: 8,
    totalSeats: 30,
    amenities: ["Wi-Fi", "Full Recliner (140°)", "Charging Port", "Blanket & Pillow", "Live GPS"],
    image: "seater-bus.jpg"
  },
  {
    id: "bus-103",
    name: "London Express MAN Lion's Coach #LX-302",
    operator: "London Express",
    busType: "MAN Multi-Axle Luxury Sleeper Pod",
    departureTime: "08:15 AM",
    arrivalTime: "01:45 PM",
    duration: "5h 30m",
    from: "Dhaka",
    to: "Sylhet",
    boardingPoints: ["Mohakhali Intercity Concourse (07:45 AM)", "Sayedabad Central Depot (08:15 AM)"],
    droppingPoints: ["Kadamtoli Central Bus Terminal, Sylhet", "Subidbazar Point"],
    price: 1250,
    rating: 4.85,
    reviewsCount: 310,
    availableSeats: 12,
    totalSeats: 32,
    amenities: ["Wi-Fi", "4K Touchscreen", "Sleeper Pod", "Mineral Water", "Live GPS"],
    image: "hero-bus.jpg"
  },
  {
    id: "bus-104",
    name: "Desh Travels Platinum Class #DT-505",
    operator: "Desh Travels",
    busType: "Hyundai Universe VIP Class (2+1)",
    departureTime: "02:30 PM",
    arrivalTime: "07:30 PM",
    duration: "5h 00m",
    from: "Dhaka",
    to: "Rajshahi",
    boardingPoints: ["Kalyanpur Main Terminal (02:00 PM)", "Gabtoli Intercity Counter (02:30 PM)"],
    droppingPoints: ["Shiroil Bus Terminal, Rajshahi", "Railgate Concourse"],
    price: 1200,
    rating: 4.8,
    reviewsCount: 265,
    availableSeats: 18,
    totalSeats: 36,
    amenities: ["Wi-Fi", "Air Conditioning", "Reclining Seats", "USB Charger", "Live GPS"],
    image: "seater-bus.jpg"
  },
  {
    id: "bus-105",
    name: "Hanif Enterprise Volvo B11R #HN-202",
    operator: "Hanif Enterprise",
    busType: "Volvo B11R Multi-Axle AC Sleeper",
    departureTime: "11:00 PM",
    arrivalTime: "07:45 AM",
    duration: "8h 45m",
    from: "Dhaka",
    to: "Cox's Bazar",
    boardingPoints: ["Sayedabad Hanif Terminal (10:30 PM)", "Gabtoli Counter (11:00 PM)"],
    droppingPoints: ["Kolatoli Main Road, Cox's Bazar", "Sugandha Point Hub"],
    price: 2000,
    rating: 4.75,
    reviewsCount: 412,
    availableSeats: 6,
    totalSeats: 30,
    amenities: ["Wi-Fi", "Restroom Onboard", "Sleeper Pod", "Personal Light", "Live GPS"],
    image: "sleeper-bus.jpg"
  },
  {
    id: "bus-106",
    name: "Sakura Royal Express #SK-810",
    operator: "Sakura Paribahan",
    busType: "Hino 1J RM2 Luxury AC (Padma Bridge Line)",
    departureTime: "09:30 AM",
    arrivalTime: "01:15 PM",
    duration: "3h 45m",
    from: "Dhaka",
    to: "Barishal",
    boardingPoints: ["Sayedabad Padma Bridge Concourse (09:00 AM)"],
    droppingPoints: ["Nathullabad Central Bus Terminal, Barishal"],
    price: 950,
    rating: 4.8,
    reviewsCount: 195,
    availableSeats: 22,
    totalSeats: 40,
    amenities: ["Wi-Fi", "Air Conditioning", "Live GPS", "Emergency First Aid"],
    image: "hero-bus.jpg"
  }
];

export const SAAS_PLANS = [
  {
    name: "Starter Operator",
    price: "৳9,999",
    period: "/month",
    description: "Ideal for local bus owners running 1 to 5 active intercity routes.",
    features: [
      "Up to 5 Active Buses",
      "Standard Seat Reservation UI",
      "Live GPS Dispatch Map",
      "Email & SMS Passenger Alerts (bKash/Nagad Ready)",
      "Instant Daily Payouts (BEFTN / MFS)",
      "2% Booking Commission Fee"
    ],
    highlight: false,
    cta: "Start 14-Day Free Trial"
  },
  {
    name: "Pro Marketplace",
    price: "৳29,999",
    period: "/month",
    description: "For scaling bus operators seeking max direct bookings & zero downtime across Bangladesh.",
    features: [
      "Up to 25 Active Buses",
      "Custom Branded E-Tickets with QR",
      "Advanced Interactive Seat Map Engine",
      "Eid & Holiday Surge Fare Pricing",
      "Instant Direct Bank / MFS Settlement",
      "Priority 24/7 Bangla & English Phone Support",
      "1% Reduced Commission Fee"
    ],
    highlight: true,
    badge: "Most Popular",
    cta: "Launch Pro Fleet"
  },
  {
    name: "Enterprise Fleet",
    price: "৳69,999",
    period: "/month",
    description: "Custom multi-division SaaS solution for national transit corporations.",
    features: [
      "Unlimited Buses & Drivers",
      "Dedicated White-Label iOS/Android Passenger Apps",
      "Custom API & ERP Integrations",
      "AI Passenger Demand Forecasting (Festival Rush)",
      "0% Commission (Flat SaaS Fee)",
      "SLA 99.99% Uptime Guarantee"
    ],
    highlight: false,
    cta: "Contact Enterprise Sales"
  }
];

export const TESTIMONIALS = [
  {
    name: "Tanvir Ahmed",
    role: "Frequent Corporate Traveler (Dhaka - Chattogram)",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    text: "Bookify completely redefined bus travel for me. The Green Line double-decker sleeper pod felt like first class on wheels! The live GPS tracking on the Dhaka-Chattogram highway is pinpoint accurate.",
    rating: 5,
    verified: true
  },
  {
    name: "Kazi Rafiqul Islam",
    role: "Fleet Director, Shohagh Paribahan Group",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    text: "As an operator listing on Bookify, our seat occupancy jumped by 42% in 60 days. The SaaS dashboard and bKash instant payouts make running 25 Scania buses completely effortless.",
    rating: 5,
    verified: true
  },
  {
    name: "Farhana Yasmin",
    role: "Travel Blogger & Digital Nomad",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
    text: "The seat map picking experience is super smooth! I booked my sleeper pod for Cox's Bazar from my phone in 30 seconds and got a clean digital QR boarding pass on WhatsApp and SMS.",
    rating: 5,
    verified: true
  }
];
