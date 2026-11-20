# Bookify hosted demo implementation contract

The hosted demo uses signed, expiring opaque-to-client session cookies issued by Express for Passenger, Vendor and Admin. Demo identities operate on synthetic records. Two vendor identities permit tenant-isolation checks. Demo access is opt-in and Stripe keys must be test-mode keys.

Public API reads expose scheduled trips, coach class, route, approved fare and available seat labels. Vendor commands create fleet assets, submit route and fare proposals and schedule approved trips. Admin commands accept/reject proposals, set route duration, and control eligibility. All writes require server-established identity. Vendor reads and writes constrain vendor ID. The public database tables use RLS with no browser policies, and only service-role RPC grants.

Use integer BDT minor units. Express requests a 600-second atomic hold before creating a Stripe hosted card checkout. The Checkout session can outlive the seat hold due to Stripe's expiration constraints. A valid paid event confirms only while the original inventory remains eligible and held. Otherwise issue an idempotent refund. A signed webhook must validate payment state, amount, currency and related booking before fulfillment. Duplicate provider notifications cannot issue a second ticket or refund. Cancellation of a future confirmed booking starts an idempotent refund and restores inventory following Stripe acceptance. Use a server-configured public base URL for Stripe return paths.

The database serializes inventory transitions per trip and stores approved facts in immutable trip snapshots. A unique booking UUID is the printable ticket reference. Admin and vendor reports are derived from booking and trip state.
