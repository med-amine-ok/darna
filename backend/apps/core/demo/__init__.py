"""
Demo world for development and demos (``python manage.py seed_demo``).

The website and the admin panel used to read in-memory mock data. This
package recreates the same world in the database through the backend's own
services, so the demo respects the business rules and the ledger:

- ``data/frontend_mocks.json``: the website mocks (users, organisations,
  listings, trips, reservations, conversations, notifications) and the
  admin staff list, exported once from the TypeScript files;
- ``generated.py``: a moderate, deterministic extra set in the spirit of the
  admin panel generator (fixed random seed);
- ``clock.py``: runs a service "as if" at a past moment, so past stays can be
  booked, confirmed, completed and reviewed by the real services;
- ``seeder.py``: the orchestration, called by the management command.
"""
