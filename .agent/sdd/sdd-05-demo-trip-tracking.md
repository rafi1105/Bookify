# Simulated trip tracking

My Bookings shows three fictional demo trips. Each page session assigns normal, traffic and accident scenarios randomly across the three trips, one each. Disruptions begin on the third simulation tick for their assigned trips and last four ticks. The tracker ticks every three seconds, stops moving during the accident, slows in traffic and adds the resulting delay to the ETA. Trips finish at 100%. The tracker is labeled as a simulation and does not connect to any location service or incident feed. No API, database, map, radius or traffic controls are required.
