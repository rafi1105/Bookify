# Demo access and live UI audit

A shared sign-in dialog offers Passenger, Vendor and Admin entry. Vendor entry prompts for one of the API's demo vendors. After sign-in the header shows the active role and a sign-out action. Signing out clears the session and permits another role to be selected. Dashboards and My Bookings use the same session state. Checkout requires a passenger session and can open the role dialog without discarding the current seat form. Express rejects changing an active role until logout.

The public landing page prioritizes trip search and removes unverified promotional content. Dashboard navigation groups fleet, routes and trips. Deployment can enable synthetic demo sessions independently of Supabase and Stripe. The application reports backend availability errors as errors, without replacing persistent data with a mock.
